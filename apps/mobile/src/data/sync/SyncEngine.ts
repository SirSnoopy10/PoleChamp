import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { ServerEventPayload } from '@polechamp/contracts';
import { ApiError, unwrap } from '../api';
import { tokenStore } from '../api/tokens';
import type { DeviceAuth } from '../auth/deviceAuth';
import { network } from '../network/online';
import { outbox } from '../outbox/outbox';
import type { SyncEngineHooks } from '../realtime/judgeBindings';
import type { RtSocket } from '../realtime/socket';
import { endJudgeSessions, putServerSheet, type ServerSheet } from './apply';
import { diagLog } from './diagLog';
import { syncEvents, type JudgeSessionEndReason, type SyncEvent } from './events';
import { HEARTBEAT_MS, sendHeartbeat } from './heartbeat';
import { readMeta } from './meta';
import { pull, type SyncDeps } from './pull';
import { needsPull, pushOnce, type Rejection } from './push';
import { handleRejections } from './RejectionHandler';
import { refreshFromDb, syncStore } from './syncStore';

type Kind = 'push' | 'pull' | 'sync';

export interface SyncEngineDeps extends SyncDeps {
  auth?: DeviceAuth;
  random?: () => number;
  batteryLevel?: () => Promise<number | null>;
  /** Sędzia zalogowany na tablecie (heartbeat, ikony kolejki). */
  activeJudgeId?: () => string | null;
  socket?: () => RtSocket | null;
  /** Odłączenie tabletu – przejście do SCR-JDG-10 (EP-08). */
  onRevoked?: () => void;
  netInfo?: Pick<typeof NetInfo, 'addEventListener'>;
  appState?: Pick<typeof AppState, 'addEventListener'>;
}

const REVOKE_REASON: Record<ServerEventPayload<'session.revoked'>['reason'], JudgeSessionEndReason> = {
  DEVICE_REVOKED: 'DEVICE_REVOKED',
  PIN_RESET: 'PIN_CHANGED',
  REPLACED: 'REPLACED',
  JUDGE_DEACTIVATED: 'JUDGE_INACTIVE',
  TOURNAMENT_FINISHED: 'TOURNAMENT_FINISHED',
};

/**
 * Silnik synchronizacji tabletu (IMP-355): jeden przebieg naraz (kolejne wywołania czekają na bieżący
 * i ustawiają „jeszcze raz”), wyzwalacze z 06-offline §3.1, timer i heartbeat co 30 s (tylko na
 * pierwszym planie). Implementuje `SyncEngineHooks` dla powiązań realtime (`bindJudgeEvents`).
 */
export class SyncEngine implements SyncEngineHooks {
  private current: Promise<void> | null = null;
  private queued = new Set<Kind>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: (() => void)[] = [];
  private revoked = false;

  constructor(private readonly deps: SyncEngineDeps) {}

  /** Start aplikacji / trybu sędziego: odtworzenie kolejki (TL-20), retencja, wyzwalacze i timery. */
  async start(): Promise<void> {
    if (this.unsubscribers.length) return void this.syncNow();
    await outbox.recoverInFlight(this.deps.local);
    const meta = readMeta(this.deps.local.read);
    await outbox.cleanup(this.deps.local, this.deps.clock.now(), meta.tournamentFinishedAt !== null);
    this.refresh();
    const netInfo = this.deps.netInfo ?? NetInfo;
    let reachable: boolean | null = null;
    this.unsubscribers.push(
      netInfo.addEventListener((s) => {
        const now = s.isConnected === true && s.isInternetReachable !== false;
        if (now && reachable === false) void this.syncNow();
        reachable = now;
      }),
    );
    const appState = this.deps.appState ?? AppState;
    const sub = appState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        this.startTimers();
        void this.request('pull');
        void this.request('push');
      } else if (state === 'background') {
        this.stopTimers();
      }
    });
    this.unsubscribers.push(() => sub.remove());
    this.startTimers();
    void this.syncNow();
  }

  stop(): void {
    this.stopTimers();
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
  }

  /** Token → push → pull (powrót sieci, „Synchronizuj teraz”). */
  syncNow(): Promise<void> {
    return this.request('sync');
  }

  /** Zatwierdzenie oceny → natychmiastowa wysyłka. */
  push(): Promise<void> {
    return this.request('push');
  }

  pull(): void {
    void this.request('pull');
  }

  /** Jawne `pull` z obietnicą (testy, ekrany). */
  pullNow(): Promise<void> {
    return this.request('pull');
  }

  cursor(): number {
    return readMeta(this.deps.local.read).cursor;
  }

  /** `category.locked` przez WS – lokalny tryb tylko do odczytu od razu (06-offline §6 pkt 2). */
  lockCategory(categoryId: string): void {
    void this.setCategoryStatus(categoryId, 'LOCKED');
  }

  unlockCategory(categoryId: string): void {
    void this.setCategoryStatus(categoryId, 'IN_PROGRESS');
  }

  onSessionRevoked(e: ServerEventPayload<'session.revoked'>): void {
    if (e.reason === 'DEVICE_REVOKED') {
      void this.handleRevoked();
      return;
    }
    if (!e.judgeId) return;
    const judgeId = e.judgeId;
    const reason = REVOKE_REASON[e.reason];
    void this.endSessions(judgeId, reason);
  }

  /** Logowanie online sędziego: własne arkusze z serwera (`GET /v1/judge/me/score-sheets`). */
  async fetchJudgeSheets(judgeId: string): Promise<number> {
    const { items } = await unwrap(this.deps.api.GET('/v1/judge/me/score-sheets'));
    await this.deps.local.tx((db) =>
      items.forEach((s) => putServerSheet(db, { ...s, judgeId } satisfies ServerSheet)),
    );
    syncEvents.emit([{ type: 'sheetsChanged', judgeIds: [judgeId] }]);
    this.refresh();
    return items.length;
  }

  /** `DEVICE_REVOKED` spoza przebiegu synchronizacji (np. token przy rozruchu, logowanie PIN-em). */
  revoke(): Promise<void> {
    return this.handleRevoked();
  }

  /** Zakończenie bieżącego przebiegu (rozruch tabletu czeka na pierwszy push/pull – IMP-302). */
  whenIdle(): Promise<void> {
    return this.current ?? Promise.resolve();
  }

  isRevoked(): boolean {
    return this.revoked;
  }

  private request(kind: Kind): Promise<void> {
    if (this.revoked) return Promise.resolve();
    if (this.current) {
      this.queued.add(kind);
      return this.current;
    }
    this.current = this.loop(kind).finally(() => {
      this.current = null;
    });
    return this.current;
  }

  private async loop(first: Kind): Promise<void> {
    let kinds = new Set<Kind>([first]);
    syncStore.setState({ isSyncing: true });
    try {
      while (kinds.size && !this.revoked) {
        await this.runOnce(kinds);
        kinds = this.queued;
        this.queued = new Set();
      }
    } finally {
      this.refresh();
      syncStore.setState({ isSyncing: false });
    }
  }

  private async runOnce(kinds: Set<Kind>): Promise<void> {
    const wantsPush = kinds.has('push') || kinds.has('sync');
    let wantsPull = kinds.has('pull') || kinds.has('sync');
    try {
      if (kinds.has('sync')) await this.deps.auth?.ensureToken();
      if (wantsPush) {
        const result = await this.pushAll();
        if (result === 'revoked') return this.handleRevoked();
        if (result === 'needsPull') wantsPull = true;
      }
      if (wantsPull) {
        await pull(this.deps);
        diagLog.add({ event: 'pull', status: 'ok', pending: outbox.countPending(this.deps.local.read) });
      }
      syncStore.setState({ lastSyncAt: this.deps.clock.now() });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'DEVICE_REVOKED') return this.handleRevoked();
      diagLog.add({
        event: wantsPull && !wantsPush ? 'pull' : 'sync',
        status: 'error',
        code: error instanceof ApiError ? error.code : 'CLIENT',
        http: error instanceof ApiError ? error.status : null,
      });
    }
  }

  /** Paczki do pustej kolejki lub pierwszego niepowodzenia (backoff zaplanowany w outboxie). */
  private async pushAll(): Promise<'done' | 'needsPull' | 'revoked'> {
    let pullNeeded = false;
    const rejections: Rejection[] = [];
    for (;;) {
      const out = await pushOnce(this.deps);
      const pending = outbox.countPending(this.deps.local.read);
      if (out.status === 'empty') break;
      if (out.status === 'revoked') {
        diagLog.add({ event: 'push', status: 'revoked', code: 'DEVICE_REVOKED', http: 401, pending });
        return 'revoked';
      }
      if (out.status === 'retry') {
        diagLog.add({ event: 'push', status: 'retry', code: out.error, pending });
        break;
      }
      diagLog.add({ event: 'push', status: 'ok', http: 200, sent: out.sent, pending });
      rejections.push(...out.rejections);
      pullNeeded ||= needsPull(this.deps, out.serverCursor);
      this.refresh();
      if (!out.more) break;
    }
    if (rejections.length) {
      for (const r of rejections)
        diagLog.add({ event: 'rejected', status: 'rejected', code: r.code, mutationId: r.mutationId });
      await handleRejections(this.deps, rejections);
    }
    return pullNeeded ? 'needsPull' : 'done';
  }

  /** Procedura odłączenia (06-offline §7): stop, koniec sesji sędziów, kolejka zostaje do eksportu. */
  private async handleRevoked(): Promise<void> {
    if (this.revoked) return;
    this.revoked = true;
    this.stop();
    const now = new Date(this.deps.clock.now()).toISOString();
    const ended = await this.deps.local.tx((db) =>
      db
        .getAllSync<{ judge_id: string }>(
          'SELECT DISTINCT judge_id FROM local_judge_session WHERE ended_at IS NULL',
        )
        .filter((r) => endJudgeSessions(db, r.judge_id, 'DEVICE_REVOKED', now))
        .map((r): SyncEvent => ({
          type: 'judgeSessionEnded',
          judgeId: r.judge_id,
          reason: 'DEVICE_REVOKED',
        })),
    );
    await tokenStore.setJudge(null);
    syncStore.setState({ revoked: true });
    syncEvents.emit(ended);
    this.refresh();
    this.deps.onRevoked?.();
  }

  private async endSessions(judgeId: string, reason: JudgeSessionEndReason): Promise<void> {
    const now = new Date(this.deps.clock.now()).toISOString();
    const ended = await this.deps.local.tx((db) => endJudgeSessions(db, judgeId, reason, now));
    if (ended) syncEvents.emit([{ type: 'judgeSessionEnded', judgeId, reason }]);
  }

  private async setCategoryStatus(categoryId: string, status: 'LOCKED' | 'IN_PROGRESS') {
    const changed = await this.deps.local.tx(
      (db) => db.runSync('UPDATE local_category SET status = ? WHERE id = ?', status, categoryId).changes,
    );
    if (changed) syncEvents.emit([{ type: 'categoryStatusChanged', categoryId, status }]);
  }

  private startTimers(): void {
    if (this.timer || this.revoked) return;
    this.timer = setInterval(() => void this.tick(), HEARTBEAT_MS);
  }

  private stopTimers(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Co 30 s: heartbeat oraz push/pull, gdy outbox niepusty lub brak WebSocketu. */
  async tick(): Promise<void> {
    const pending = outbox.countPending(this.deps.local.read);
    if (pending > 0 || !network.isWsConnected()) await this.syncNow();
    if (this.revoked) return;
    try {
      const via = await sendHeartbeat({
        api: this.deps.api,
        db: this.deps.local.read,
        batteryLevel: this.deps.batteryLevel ?? (async () => null),
        activeJudgeId: this.deps.activeJudgeId ?? (() => null),
        socket: this.deps.socket,
      });
      diagLog.add({ event: 'heartbeat', status: via, pending });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'DEVICE_REVOKED') return this.handleRevoked();
      diagLog.add({
        event: 'heartbeat',
        status: 'error',
        code: error instanceof ApiError ? error.code : 'CLIENT',
      });
    }
  }

  private refresh(): void {
    refreshFromDb(this.deps.local.read, this.deps.activeJudgeId?.() ?? null);
  }
}
