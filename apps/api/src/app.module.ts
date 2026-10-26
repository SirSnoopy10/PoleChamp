import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CommonModule } from './common/common.module.js';
import { ProblemDetailsFilter } from './common/errors/problem.filter.js';
import type { Env } from './config/env.js';
import { HealthController, Readiness } from './health/health.controller.js';
import { InfraModule } from './infra/infra.module.js';
import { E2eModule } from './modules/e2e/e2e.module.js';
import { FEATURE_MODULES } from './modules/index.js';

@Module({})
export class AppModule {
  static forRoot(env: Env, extraModules: Type[] = []): DynamicModule {
    return {
      module: AppModule,
      imports: [
        InfraModule.forRoot(env),
        CommonModule,
        ...FEATURE_MODULES,
        ...(env.E2E_HELPERS ? [E2eModule] : []),
        ...extraModules,
      ],
      controllers: [HealthController],
      providers: [Readiness, { provide: APP_FILTER, useClass: ProblemDetailsFilter }],
    };
  }
}
