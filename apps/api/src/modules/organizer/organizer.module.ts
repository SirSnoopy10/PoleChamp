import { Module } from '@nestjs/common';
import { OwnershipRepository } from '../../db/repositories/ownership.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { LimitsService } from '../limits/limits.service.js';
import { ResultsService } from '../results/results.service.js';
import { CategoriesService } from './categories.service.js';
import { CategoryLockService } from './category-lock.service.js';
import { EntriesService } from './entries.service.js';
import { JudgesService } from './judges.service.js';
import {
  CategoriesController,
  ConfigItemsController,
  TournamentsController,
} from './organizer.controllers.js';
import { PinService } from './pin.service.js';
import { TournamentsService } from './tournaments.service.js';

/** Konfiguracja turnieju przez organizatora (EP-03, IMP-121…132). */
@Module({
  imports: [AuthModule],
  controllers: [TournamentsController, CategoriesController, ConfigItemsController],
  providers: [
    OwnershipRepository,
    LimitsService,
    ResultsService,
    PinService,
    TournamentsService,
    CategoryLockService,
    CategoriesService,
    EntriesService,
    JudgesService,
  ],
  exports: [
    OwnershipRepository,
    PinService,
    LimitsService,
    ResultsService,
    CategoryLockService,
    TournamentsService,
    CategoriesService,
    EntriesService,
    JudgesService,
  ],
})
export class OrganizerModule {}
