import type { Type } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { OrganizerModule } from './organizer/organizer.module.js';
import { RejectedModule } from './rejected/rejected.module.js';
import { SyncModule } from './sync/sync.module.js';

/** Moduły domenowe rejestrowane w `AppModule` (dopisywane w kolejnych zadaniach EP-03…EP-05). */
export const FEATURE_MODULES: Type[] = [
  AuthModule,
  OrganizerModule,
  DevicesModule,
  SyncModule,
  RejectedModule,
];
