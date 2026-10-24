import { Inject, Injectable } from '@nestjs/common';
import type { AppConfig, LoginRequest, Me, RegisterRequest, TokenPair } from '@polechamp/contracts';
import { formatTournamentDate } from '@polechamp/i18n';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import { DomainError, validationFailed } from '../../common/errors/domain-error.js';
import { randomToken, safeEqual, sha256, uuidv7 } from '../../common/ids.js';
import { requestContext } from '../../common/request-context.js';
import { ENV, type Env } from '../../config/env.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import { appUser, authEmailToken, authRefreshToken, device, tournament } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { AuditService, DomainEventService } from '../audit/audit.service.js';
import { EmailProducer } from '../email/email.queue.js';
import { JwtService, type OrgClaims } from './jwt.service.js';
import { PasswordBreachService, PasswordService } from './password.service.js';

const DAY_MS = 86_400_000;
const VERIFY_CODE_TTL_MS = DAY_MS;
const RESET_TOKEN_TTL_MS = 60 * 60_000;
const REFRESH_TTL_MS = 30 * DAY_MS;
const MAX_CODE_ATTEMPTS = 5;
const MAX_FAILED_LOGINS = 5;
const LOCK_BASE_MS = 15 * 60_000;
const LOCK_MAX_MS = DAY_MS;
const ACCOUNT_DELETION_GRACE_DAYS = 30;

type User = typeof appUser.$inferSelect;

/** Konto i sesja organizatora (03-api §3.1; IMP-114…118). */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(PasswordBreachService) private readonly breach: PasswordBreachService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
    @Inject(EmailProducer) private readonly email: EmailProducer,
  ) {}

  private async findActiveUser(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(appUser)
      .where(and(eq(appUser.email, email), isNull(appUser.deletedAt)));
    return user;
  }

  private async userById(id: string): Promise<User> {
    const [user] = await this.db
      .select()
      .from(appUser)
      .where(and(eq(appUser.id, id), isNull(appUser.deletedAt)));
    if (!user) throw new DomainError('UNAUTHENTICATED');
    return user;
  }

  private async assertNotBreached(password: string, field: string): Promise<void> {
    if (await this.breach.isBreached(password))
      throw validationFailed([{ field, code: 'PASSWORD_BREACHED' }]);
  }

  /** Nowy kod/token e-mail unieważnia poprzednie tego samego celu (02-model §2.23a). */
  private async issueEmailToken(tx: Tx, userId: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD') {
    await tx
      .update(authEmailToken)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(authEmailToken.userId, userId),
          eq(authEmailToken.purpose, purpose),
          isNull(authEmailToken.usedAt),
        ),
      );
    const secret =
      purpose === 'VERIFY_EMAIL' ? String(randomInt(0, 1_000_000)).padStart(6, '0') : randomToken();
    const ttl = purpose === 'VERIFY_EMAIL' ? VERIFY_CODE_TTL_MS : RESET_TOKEN_TTL_MS;
    await tx.insert(authEmailToken).values({
      userId,
      purpose,
      tokenHash: sha256(secret),
      expiresAt: new Date(Date.now() + ttl),
    });
    return secret;
  }

  // IMP-114 – rejestracja
  async register(input: RegisterRequest): Promise<void> {
    await this.assertNotBreached(input.password, 'password');
    const passwordHash = await this.passwords.hash(input.password);
    const existing = await this.findActiveUser(input.email);
    if (existing) {
      // Anty-enumeracja: ta sama odpowiedź, e-mail „konto już istnieje” zamiast nowego konta.
      await this.email.enqueue('account-exists', existing.email, { name: existing.displayName });
      return;
    }
    const code = await withTx(this.db, async (tx) => {
      const [user] = await tx
        .insert(appUser)
        .values({
          email: input.email,
          passwordHash,
          displayName: input.displayName,
          termsAcceptedAt: new Date(),
          termsVersion: input.termsVersion,
        })
        .returning();
      if (!user) throw new DomainError('INTERNAL');
      await this.audit.record(tx, {
        action: 'ACCOUNT_REGISTERED',
        entityType: 'app_user',
        entityId: user.id,
        after: { displayName: user.displayName, termsVersion: user.termsVersion },
      });
      return this.issueEmailToken(tx, user.id, 'VERIFY_EMAIL');
    });
    await this.email.enqueue('verify-code', input.email, { name: input.displayName, code });
  }

  // IMP-115 – weryfikacja e-maila
  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.findActiveUser(email);
    if (!user) throw new DomainError('CODE_INVALID');
    await withTx(this.db, async (tx) => {
      const [token] = await tx
        .select()
        .from(authEmailToken)
        .where(
          and(
            eq(authEmailToken.userId, user.id),
            eq(authEmailToken.purpose, 'VERIFY_EMAIL'),
            isNull(authEmailToken.usedAt),
            gt(authEmailToken.expiresAt, new Date()),
          ),
        )
        .for('update');
      if (!token || token.attempts >= MAX_CODE_ATTEMPTS) throw new DomainError('CODE_INVALID');
      if (!safeEqual(token.tokenHash, sha256(code))) {
        const attempts = token.attempts + 1;
        await tx
          .update(authEmailToken)
          .set({ attempts, usedAt: attempts >= MAX_CODE_ATTEMPTS ? new Date() : null })
          .where(eq(authEmailToken.id, token.id));
        return 'invalid' as const;
      }
      await tx.update(authEmailToken).set({ usedAt: new Date() }).where(eq(authEmailToken.id, token.id));
      await tx.update(appUser).set({ emailVerifiedAt: new Date() }).where(eq(appUser.id, user.id));
      await this.audit.record(tx, { action: 'EMAIL_VERIFIED', entityType: 'app_user', entityId: user.id });
      return 'ok' as const;
    }).then((result) => {
      // Licznik prób zapisany – błąd zgłaszamy po zatwierdzeniu transakcji.
      if (result === 'invalid') throw new DomainError('CODE_INVALID');
    });
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.userById(userId);
    if (user.emailVerifiedAt) return;
    const code = await withTx(this.db, (tx) => this.issueEmailToken(tx, user.id, 'VERIFY_EMAIL'));
    await this.email.enqueue('verify-code', user.email, { name: user.displayName, code });
  }

  // IMP-116 – logowanie, blokada, refresh, wylogowanie
  private async issueTokens(
    tx: Tx,
    user: User,
    familyId = uuidv7(),
  ): Promise<TokenPair & { tokenId: string }> {
    const refreshToken = `rt_${randomToken()}`;
    const ctx = requestContext.get();
    const [row] = await tx
      .insert(authRefreshToken)
      .values({
        userId: user.id,
        familyId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        ip: ctx?.ip ?? null,
      })
      .returning({ id: authRefreshToken.id });
    const { token, expiresIn } = await this.jwt.sign({ typ: 'org', sub: user.id, fam: familyId });
    return {
      accessToken: token,
      refreshToken,
      expiresIn,
      tokenId: row?.id ?? '',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerifiedAt !== null,
      },
    };
  }

  async login(input: LoginRequest): Promise<TokenPair> {
    const user = await this.findActiveUser(input.email);
    const now = Date.now();
    if (user?.lockedUntil && user.lockedUntil.getTime() > now) {
      throw new DomainError('ACCOUNT_LOCKED', undefined, {
        retryAfterSeconds: Math.ceil((user.lockedUntil.getTime() - now) / 1000),
      });
    }
    const ok = await this.passwords.verify(user?.passwordHash ?? null, input.password);
    if (!user || !ok) {
      if (user) await this.registerFailedLogin(user);
      throw new DomainError('INVALID_CREDENTIALS');
    }
    return withTx(this.db, async (tx) => {
      await tx.update(appUser).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(appUser.id, user.id));
      requestContext.setActor({ type: 'ORGANIZER', id: user.id });
      await this.audit.record(tx, { action: 'LOGIN_SUCCEEDED', entityType: 'app_user', entityId: user.id });
      const { tokenId: _id, ...pair } = await this.issueTokens(tx, user);
      return pair;
    });
  }

  /** 5 nieudanych prób → blokada 15 min × 2^poziom (maks. 24 h), poziom +1 (FR-107). */
  private async registerFailedLogin(user: User): Promise<void> {
    await withTx(this.db, async (tx) => {
      const failed = user.failedLoginCount + 1;
      if (failed >= MAX_FAILED_LOGINS) {
        const lockMs = Math.min(LOCK_BASE_MS * 2 ** user.lockoutLevel, LOCK_MAX_MS);
        await tx
          .update(appUser)
          .set({
            failedLoginCount: 0,
            lockedUntil: new Date(Date.now() + lockMs),
            lockoutLevel: user.lockoutLevel + 1,
          })
          .where(eq(appUser.id, user.id));
        await this.audit.record(tx, {
          action: 'ACCOUNT_LOCKED',
          entityType: 'app_user',
          entityId: user.id,
          after: { lockMinutes: lockMs / 60_000 },
        });
      } else {
        await tx.update(appUser).set({ failedLoginCount: failed }).where(eq(appUser.id, user.id));
        await this.audit.record(tx, { action: 'LOGIN_FAILED', entityType: 'app_user', entityId: user.id });
      }
    });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const result = await withTx(this.db, async (tx) => {
      const [current] = await tx
        .select()
        .from(authRefreshToken)
        .where(eq(authRefreshToken.tokenHash, sha256(refreshToken)))
        .for('update');
      if (!current) throw new DomainError('UNAUTHENTICATED');
      if (current.revokedAt) {
        // Ponowne użycie zrotowanego tokenu – możliwa kradzież: unieważnij całą rodzinę.
        await tx
          .update(authRefreshToken)
          .set({ revokedAt: new Date() })
          .where(and(eq(authRefreshToken.familyId, current.familyId), isNull(authRefreshToken.revokedAt)));
        requestContext.setActor({ type: 'ORGANIZER', id: current.userId });
        await this.audit.record(tx, {
          action: 'REFRESH_TOKEN_REUSED',
          entityType: 'app_user',
          entityId: current.userId,
        });
        return 'reused' as const;
      }
      if (current.expiresAt.getTime() <= Date.now()) throw new DomainError('UNAUTHENTICATED');
      const user = await this.userById(current.userId);
      const next = await this.issueTokens(tx, user, current.familyId);
      await tx
        .update(authRefreshToken)
        .set({ revokedAt: new Date(), replacedById: next.tokenId })
        .where(eq(authRefreshToken.id, current.id));
      const { tokenId: _id, ...pair } = next;
      return pair;
    });
    if (result === 'reused') throw new DomainError('TOKEN_REUSED');
    return result;
  }

  async logout(claims: OrgClaims): Promise<void> {
    await this.db
      .update(authRefreshToken)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authRefreshToken.userId, claims.sub),
          claims.fam ? eq(authRefreshToken.familyId, claims.fam) : sql`true`,
          isNull(authRefreshToken.revokedAt),
        ),
      );
  }

  // IMP-117 – reset hasła
  async forgotPassword(email: string): Promise<void> {
    const user = await this.findActiveUser(email);
    if (!user) return;
    const token = await withTx(this.db, (tx) => this.issueEmailToken(tx, user.id, 'RESET_PASSWORD'));
    const link = `${this.env.PUBLIC_WEB_URL}/reset?token=${encodeURIComponent(token)}`;
    await this.email.enqueue('password-reset', user.email, { name: user.displayName, link });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const [row] = await this.db
      .select()
      .from(authEmailToken)
      .where(
        and(
          eq(authEmailToken.tokenHash, sha256(token)),
          eq(authEmailToken.purpose, 'RESET_PASSWORD'),
          isNull(authEmailToken.usedAt),
          gt(authEmailToken.expiresAt, new Date()),
        ),
      );
    if (!row) throw new DomainError('RESET_TOKEN_INVALID');
    await this.assertNotBreached(newPassword, 'newPassword');
    const passwordHash = await this.passwords.hash(newPassword);
    await withTx(this.db, async (tx) => {
      const used = await tx
        .update(authEmailToken)
        .set({ usedAt: new Date() })
        .where(and(eq(authEmailToken.id, row.id), isNull(authEmailToken.usedAt)))
        .returning({ id: authEmailToken.id });
      if (used.length === 0) throw new DomainError('RESET_TOKEN_INVALID');
      await tx
        .update(appUser)
        .set({ passwordHash, failedLoginCount: 0, lockedUntil: null, lockoutLevel: 0, updatedAt: new Date() })
        .where(eq(appUser.id, row.userId));
      await tx
        .update(authRefreshToken)
        .set({ revokedAt: new Date() })
        .where(and(eq(authRefreshToken.userId, row.userId), isNull(authRefreshToken.revokedAt)));
      requestContext.setActor({ type: 'ORGANIZER', id: row.userId });
      await this.audit.record(tx, { action: 'PASSWORD_RESET', entityType: 'app_user', entityId: row.userId });
    });
  }

  // IMP-118 – profil i usunięcie konta
  async me(userId: string): Promise<Me> {
    const user = await this.userById(userId);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerifiedAt !== null,
      locale: user.locale === 'en' ? 'en' : 'pl',
    };
  }

  async updateMe(userId: string, patch: { displayName?: string; locale?: 'pl' | 'en' }): Promise<Me> {
    const before = await this.userById(userId);
    await withTx(this.db, async (tx) => {
      await tx
        .update(appUser)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(appUser.id, userId));
      await this.audit.record(tx, {
        action: 'ACCOUNT_UPDATED',
        entityType: 'app_user',
        entityId: userId,
        before: { displayName: before.displayName, locale: before.locale },
        after: {
          displayName: patch.displayName ?? before.displayName,
          locale: patch.locale ?? before.locale,
        },
      });
    });
    return this.me(userId);
  }

  async deleteMe(userId: string): Promise<void> {
    const user = await this.userById(userId);
    const [active] = await this.db
      .select({ id: tournament.id })
      .from(tournament)
      .where(
        and(
          eq(tournament.ownerId, userId),
          eq(tournament.status, 'IN_PROGRESS'),
          isNull(tournament.deletedAt),
        ),
      );
    if (active) throw new DomainError('ACTIVE_TOURNAMENT_EXISTS');
    const hardDeleteAt = new Date(Date.now() + ACCOUNT_DELETION_GRACE_DAYS * DAY_MS);
    await withTx(this.db, async (tx) => {
      const now = new Date();
      await tx.update(appUser).set({ deletedAt: now }).where(eq(appUser.id, userId));
      await tx
        .update(authRefreshToken)
        .set({ revokedAt: now })
        .where(and(eq(authRefreshToken.userId, userId), isNull(authRefreshToken.revokedAt)));
      const revoked = await tx
        .update(device)
        .set({ revokedAt: now })
        .where(
          and(
            isNull(device.revokedAt),
            sql`${device.tournamentId} IN (SELECT id FROM tournament WHERE owner_id = ${userId})`,
          ),
        )
        .returning({ id: device.id, tournamentId: device.tournamentId });
      for (const d of revoked) {
        await this.events.emit(tx, 'session.revoked', { reason: 'DEVICE_REVOKED' }, d.tournamentId);
      }
      await this.audit.record(tx, {
        action: 'ACCOUNT_DELETION_REQUESTED',
        entityType: 'app_user',
        entityId: userId,
        after: { hardDeleteAt: hardDeleteAt.toISOString(), revokedDevices: revoked.length },
      });
    });
    await this.email.enqueue('account-deletion', user.email, {
      name: user.displayName,
      date: formatTournamentDate(hardDeleteAt.toISOString().slice(0, 10)),
    });
  }

  // IMP-120 – konfiguracja aplikacji
  appConfig(): AppConfig {
    const base = this.env.LEGAL_BASE_URL;
    return {
      minAppVersion: this.env.APP_MIN_VERSION,
      minSyncAppVersion: this.env.APP_MIN_SYNC_VERSION,
      termsVersion: this.env.TERMS_VERSION,
      legal: {
        termsUrl: `${base}/regulamin`,
        privacyUrl: `${base}/prywatnosc`,
        dpaUrl: `${base}/umowa-powierzenia`,
        accountDeletionUrl: `${base}/usuniecie-konta`,
        supportUrl: `${base}/pomoc`,
      },
    };
  }
}
