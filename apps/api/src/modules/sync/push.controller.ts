import { Body, Controller, HttpCode, Inject, type PipeTransform, Post } from '@nestjs/common';
import { PushRequest } from '@polechamp/contracts';
import { Auth, CurrentAuth, type DeviceClaims, type JudgeClaims } from '../../common/auth/auth.decorators.js';
import { DomainError } from '../../common/errors/domain-error.js';
import { parseOrThrow } from '../../common/validation/zod.pipe.js';
import { PushService } from './push.service.js';

export const MAX_BATCH = 100;

/** Paczka > 100 mutacji → 413 bez przetwarzania (TC-API-080); treść > 1 MB odrzuca już Fastify. */
class PushBodyPipe implements PipeTransform<unknown, PushRequest> {
  transform(value: unknown): PushRequest {
    const mutations = (value as { mutations?: unknown } | null)?.mutations;
    if (Array.isArray(mutations) && mutations.length > MAX_BATCH) {
      throw new DomainError(
        'VALIDATION_FAILED',
        `Paczka może zawierać najwyżej ${MAX_BATCH} mutacji.`,
        {},
        413,
      );
    }
    return parseOrThrow(PushRequest, value ?? {});
  }
}

/** Wysyłka kolejki mutacji z tabletu (03-api §5.1) – token urządzenia, opcjonalnie sędziego. */
@Controller('sync')
export class PushController {
  constructor(@Inject(PushService) private readonly pushes: PushService) {}

  @Post('push')
  @Auth('device', 'judge')
  @HttpCode(200)
  push(@CurrentAuth() claims: DeviceClaims | JudgeClaims, @Body(new PushBodyPipe()) body: PushRequest) {
    return this.pushes.push(claims, body);
  }
}
