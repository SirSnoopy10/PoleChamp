import type { Type } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';

/** Moduły domenowe rejestrowane w `AppModule` (dopisywane w kolejnych zadaniach EP-03…EP-05). */
export const FEATURE_MODULES: Type[] = [AuthModule];
