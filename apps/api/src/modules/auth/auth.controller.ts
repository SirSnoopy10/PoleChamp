import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Patch, Post } from '@nestjs/common';
import {
  ForgotPasswordRequest,
  LoginRequest,
  MePatch,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '@polechamp/contracts';
import type { z } from 'zod';
import { Auth, CurrentAuth, OrgUser, Public } from '../../common/auth/auth.decorators.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.guard.js';
import { zod } from '../../common/validation/zod.pipe.js';
import { AuthService } from './auth.service.js';
import type { OrgClaims } from './jwt.service.js';

const byIp = (r: { ip?: string }) => r.ip;
const byBodyEmail = (r: { body?: unknown }) => {
  const email = (r.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? email.trim() : null;
};
const bySubject = (r: { auth?: { sub: string } }) => r.auth?.sub;

/** Konto i sesja organizatora (03-api §3.1). */
@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('auth/register')
  @Public()
  @HttpCode(201)
  @RateLimit({ policy: 'register:ip', key: byIp })
  async register(@Body(zod(RegisterRequest)) body: z.output<typeof RegisterRequest>): Promise<void> {
    await this.auth.register(body);
  }

  @Post('auth/verify-email')
  @Public()
  @HttpCode(204)
  @RateLimit({ policy: 'login:ip', key: byIp })
  async verifyEmail(@Body(zod(VerifyEmailRequest)) body: z.output<typeof VerifyEmailRequest>): Promise<void> {
    await this.auth.verifyEmail(body.email, body.code);
  }

  @Post('auth/verify-email/resend')
  @Auth('org')
  @HttpCode(202)
  @RateLimit(
    { policy: 'resend:account:minute', key: bySubject },
    { policy: 'resend:account:hour', key: bySubject },
  )
  async resend(@OrgUser() userId: string): Promise<void> {
    await this.auth.resendVerification(userId);
  }

  @Post('auth/login')
  @Public()
  @HttpCode(200)
  @RateLimit({ policy: 'login:ip', key: byIp }, { policy: 'login:account', key: byBodyEmail })
  login(@Body(zod(LoginRequest)) body: z.output<typeof LoginRequest>) {
    return this.auth.login(body);
  }

  @Post('auth/refresh')
  @Public()
  @HttpCode(200)
  @RateLimit({ policy: 'login:ip', key: byIp })
  refresh(@Body(zod(RefreshRequest)) body: z.output<typeof RefreshRequest>) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('auth/logout')
  @Auth('org')
  @HttpCode(204)
  async logout(@CurrentAuth() claims: OrgClaims): Promise<void> {
    await this.auth.logout(claims);
  }

  @Post('auth/password/forgot')
  @Public()
  @HttpCode(202)
  @RateLimit({ policy: 'forgot:ip', key: byIp })
  async forgot(
    @Body(zod(ForgotPasswordRequest)) body: z.output<typeof ForgotPasswordRequest>,
  ): Promise<void> {
    await this.auth.forgotPassword(body.email);
  }

  @Post('auth/password/reset')
  @Public()
  @HttpCode(204)
  @RateLimit({ policy: 'forgot:ip', key: byIp })
  async reset(@Body(zod(ResetPasswordRequest)) body: z.output<typeof ResetPasswordRequest>): Promise<void> {
    await this.auth.resetPassword(body.token, body.newPassword);
  }

  @Get('me')
  @Auth('org')
  me(@OrgUser() userId: string) {
    return this.auth.me(userId);
  }

  @Patch('me')
  @Auth('org')
  updateMe(@OrgUser() userId: string, @Body(zod(MePatch)) body: z.output<typeof MePatch>) {
    return this.auth.updateMe(userId, body);
  }

  @Delete('me')
  @Auth('org')
  @HttpCode(202)
  async deleteMe(@OrgUser() userId: string): Promise<void> {
    await this.auth.deleteMe(userId);
  }

  @Get('app-config')
  @Public()
  @Header('Cache-Control', 'public, max-age=300')
  appConfig() {
    return this.auth.appConfig();
  }
}
