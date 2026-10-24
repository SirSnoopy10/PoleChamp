import { Module } from '@nestjs/common';
import { EmailProducer } from '../email/email.queue.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { BREACH_FETCH, PasswordBreachService, PasswordService } from './password.service.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    PasswordBreachService,
    EmailProducer,
    { provide: BREACH_FETCH, useValue: globalThis.fetch.bind(globalThis) },
  ],
  exports: [PasswordService, EmailProducer],
})
export class AuthModule {}
