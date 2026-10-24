import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import {
  CategoryCreate,
  CategoryPatch,
  CriterionInput,
  CriterionPatch,
  EntryCreate,
  EntryPatch,
  JudgeCreate,
  JudgePatch,
  LockRequest,
  PenaltyTypeInput,
  PenaltyTypePatch,
  TournamentCreate,
  TournamentListQuery,
  TournamentPatch,
  UnlockRequest,
} from '@polechamp/contracts';
import { z } from 'zod';
import { Auth, OrgUser } from '../../common/auth/auth.decorators.js';
import { IfMatch } from '../../common/concurrency/etag.js';
import { zod } from '../../common/validation/zod.pipe.js';
import { CategoriesService } from './categories.service.js';
import { CategoryLockService } from './category-lock.service.js';
import { EntriesService } from './entries.service.js';
import { JudgesService } from './judges.service.js';
import { TournamentsService } from './tournaments.service.js';

type Out<S extends z.ZodType> = z.output<S>;
const EntryListQuery = z.object({ q: z.string().max(100).optional() });

/** Turnieje (03-api §3.2) – wszystkie trasy `ORG`, zasoby cudze → 404. */
@Controller('tournaments')
@Auth('org')
export class TournamentsController {
  constructor(
    @Inject(TournamentsService) private readonly tournaments: TournamentsService,
    @Inject(CategoriesService) private readonly categories: CategoriesService,
    @Inject(JudgesService) private readonly judges: JudgesService,
  ) {}

  @Get()
  list(@OrgUser() userId: string, @Query(zod(TournamentListQuery)) query: Out<typeof TournamentListQuery>) {
    return this.tournaments.list(userId, query.status);
  }

  @Post()
  @HttpCode(201)
  create(@OrgUser() userId: string, @Body(zod(TournamentCreate)) body: Out<typeof TournamentCreate>) {
    return this.tournaments.create(userId, body);
  }

  @Get(':tournamentId')
  details(@OrgUser() userId: string, @Param('tournamentId') id: string) {
    return this.tournaments.details(userId, id);
  }

  @Patch(':tournamentId')
  patch(
    @OrgUser() userId: string,
    @Param('tournamentId') id: string,
    @IfMatch() version: number,
    @Body(zod(TournamentPatch)) body: Out<typeof TournamentPatch>,
  ) {
    return this.tournaments.patch(userId, id, version, body);
  }

  @Delete(':tournamentId')
  @HttpCode(204)
  async remove(@OrgUser() userId: string, @Param('tournamentId') id: string, @IfMatch() version: number) {
    await this.tournaments.remove(userId, id, version);
  }

  @Post(':tournamentId/start')
  @HttpCode(200)
  start(@OrgUser() userId: string, @Param('tournamentId') id: string) {
    return this.tournaments.start(userId, id);
  }

  @Post(':tournamentId/finish')
  @HttpCode(200)
  finish(@OrgUser() userId: string, @Param('tournamentId') id: string, @IfMatch() version: number) {
    return this.tournaments.finish(userId, id, version);
  }

  @Get(':tournamentId/categories')
  listCategories(@OrgUser() userId: string, @Param('tournamentId') id: string) {
    return this.categories.list(userId, id);
  }

  @Post(':tournamentId/categories')
  @HttpCode(201)
  createCategory(
    @OrgUser() userId: string,
    @Param('tournamentId') id: string,
    @Body(zod(CategoryCreate)) body: Out<typeof CategoryCreate>,
  ) {
    return this.categories.create(userId, id, body);
  }

  @Get(':tournamentId/judges')
  listJudges(@OrgUser() userId: string, @Param('tournamentId') id: string) {
    return this.judges.list(userId, id);
  }

  @Post(':tournamentId/judges')
  @HttpCode(201)
  createJudge(
    @OrgUser() userId: string,
    @Param('tournamentId') id: string,
    @Body(zod(JudgeCreate)) body: Out<typeof JudgeCreate>,
  ) {
    return this.judges.create(userId, id, body.fullName);
  }
}

/** Kategorie, start, blokada, kryteria i kary, lista startowa (03-api §3.3–3.4). */
@Controller('categories')
@Auth('org')
export class CategoriesController {
  constructor(
    @Inject(CategoriesService) private readonly categories: CategoriesService,
    @Inject(CategoryLockService) private readonly locks: CategoryLockService,
    @Inject(EntriesService) private readonly entries: EntriesService,
  ) {}

  @Get(':categoryId')
  get(@OrgUser() userId: string, @Param('categoryId') id: string) {
    return this.categories.get(userId, id);
  }

  @Patch(':categoryId')
  patch(
    @OrgUser() userId: string,
    @Param('categoryId') id: string,
    @IfMatch() version: number,
    @Body(zod(CategoryPatch)) body: Out<typeof CategoryPatch>,
  ) {
    return this.categories.patch(userId, id, version, body);
  }

  @Delete(':categoryId')
  @HttpCode(204)
  async remove(@OrgUser() userId: string, @Param('categoryId') id: string, @IfMatch() version: number) {
    await this.categories.remove(userId, id, version);
  }

  @Post(':categoryId/start')
  @HttpCode(200)
  start(@OrgUser() userId: string, @Param('categoryId') id: string) {
    return this.categories.start(userId, id);
  }

  @Post(':categoryId/lock')
  @HttpCode(200)
  lock(
    @OrgUser() userId: string,
    @Param('categoryId') id: string,
    @Body(zod(LockRequest)) body: Out<typeof LockRequest>,
  ) {
    return this.locks.lock(userId, id, { force: body.force });
  }

  @Post(':categoryId/unlock')
  @HttpCode(200)
  async unlock(
    @OrgUser() userId: string,
    @Param('categoryId') id: string,
    @Body(zod(UnlockRequest)) body: Out<typeof UnlockRequest>,
  ) {
    await this.locks.unlock(userId, id, body.reason);
    return this.categories.get(userId, id);
  }

  @Post(':categoryId/criteria')
  @HttpCode(201)
  addCriterion(
    @OrgUser() userId: string,
    @Param('categoryId') id: string,
    @Body(zod(CriterionInput)) body: Out<typeof CriterionInput>,
  ) {
    return this.categories.addCriterion(userId, id, body);
  }

  @Post(':categoryId/penalty-types')
  @HttpCode(201)
  addPenaltyType(
    @OrgUser() userId: string,
    @Param('categoryId') id: string,
    @Body(zod(PenaltyTypeInput)) body: Out<typeof PenaltyTypeInput>,
  ) {
    return this.categories.addPenaltyType(userId, id, body);
  }

  @Get(':categoryId/entries')
  listEntries(
    @OrgUser() userId: string,
    @Param('categoryId') id: string,
    @Query(zod(EntryListQuery)) query: Out<typeof EntryListQuery>,
  ) {
    return this.entries.list(userId, id, query.q);
  }

  @Post(':categoryId/entries')
  @HttpCode(201)
  createEntry(
    @OrgUser() userId: string,
    @Param('categoryId') id: string,
    @Body(zod(EntryCreate)) body: Out<typeof EntryCreate>,
  ) {
    return this.entries.create(userId, id, body);
  }
}

@Controller()
@Auth('org')
export class ConfigItemsController {
  constructor(
    @Inject(CategoriesService) private readonly categories: CategoriesService,
    @Inject(EntriesService) private readonly entries: EntriesService,
    @Inject(JudgesService) private readonly judges: JudgesService,
  ) {}

  @Patch('criteria/:criterionId')
  patchCriterion(
    @OrgUser() userId: string,
    @Param('criterionId') id: string,
    @Body(zod(CriterionPatch)) body: Out<typeof CriterionPatch>,
  ) {
    return this.categories.patchCriterion(userId, id, body);
  }

  @Delete('criteria/:criterionId')
  @HttpCode(204)
  async removeCriterion(@OrgUser() userId: string, @Param('criterionId') id: string) {
    await this.categories.removeCriterion(userId, id);
  }

  @Patch('penalty-types/:penaltyTypeId')
  patchPenaltyType(
    @OrgUser() userId: string,
    @Param('penaltyTypeId') id: string,
    @Body(zod(PenaltyTypePatch)) body: Out<typeof PenaltyTypePatch>,
  ) {
    return this.categories.patchPenaltyType(userId, id, body);
  }

  @Delete('penalty-types/:penaltyTypeId')
  @HttpCode(204)
  async removePenaltyType(@OrgUser() userId: string, @Param('penaltyTypeId') id: string) {
    await this.categories.removePenaltyType(userId, id);
  }

  @Patch('entries/:entryId')
  patchEntry(
    @OrgUser() userId: string,
    @Param('entryId') id: string,
    @IfMatch() version: number,
    @Body(zod(EntryPatch)) body: Out<typeof EntryPatch>,
  ) {
    return this.entries.patch(userId, id, version, body);
  }

  @Post('entries/:entryId/withdraw')
  @HttpCode(200)
  withdraw(@OrgUser() userId: string, @Param('entryId') id: string) {
    return this.entries.withdraw(userId, id);
  }

  @Post('entries/:entryId/restore')
  @HttpCode(200)
  restore(@OrgUser() userId: string, @Param('entryId') id: string) {
    return this.entries.restore(userId, id);
  }

  @Delete('entries/:entryId')
  @HttpCode(204)
  async removeEntry(@OrgUser() userId: string, @Param('entryId') id: string) {
    await this.entries.remove(userId, id);
  }

  @Patch('judges/:judgeId')
  patchJudge(
    @OrgUser() userId: string,
    @Param('judgeId') id: string,
    @IfMatch() version: number,
    @Body(zod(JudgePatch)) body: Out<typeof JudgePatch>,
  ) {
    return this.judges.patch(userId, id, version, body);
  }

  @Post('judges/:judgeId/pin/reset')
  @HttpCode(200)
  resetPin(@OrgUser() userId: string, @Param('judgeId') id: string) {
    return this.judges.resetPin(userId, id);
  }

  @Delete('judges/:judgeId')
  @HttpCode(204)
  async removeJudge(@OrgUser() userId: string, @Param('judgeId') id: string) {
    await this.judges.remove(userId, id);
  }
}
