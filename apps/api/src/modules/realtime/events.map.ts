import type { ServerEventName } from '@polechamp/contracts';

/**
 * Komenda → zdarzenia realtime zapisywane w outboxie w jej transakcji (03-api §6; IMP-156). `sync.hint`
 * emituje dziennik zmian raz na transakcję, gdy komenda zmienia dane tabletu. Test `events.map.test.ts`
 * wykonuje każdą komendę i sprawdza, że powstały co najmniej te zdarzenia.
 */
export const COMMAND_EVENTS = {
  'tournament.patch': ['tournament.updated', 'sync.hint'],
  'tournament.delete': ['session.revoked'],
  'tournament.finish': [
    'tournament.updated',
    'category.locked',
    'results.updated',
    'session.revoked',
    'sync.hint',
  ],
  'category.create': ['category.updated', 'sync.hint'],
  'category.patch': ['category.updated', 'sync.hint'],
  'category.delete': ['sync.hint'],
  'category.start': [
    'category.updated',
    'tournament.updated',
    'results.updated',
    'progress.updated',
    'sync.hint',
  ],
  'category.lock': ['category.locked', 'results.updated', 'sync.hint'],
  'category.unlock': ['category.unlocked', 'results.updated', 'progress.updated', 'sync.hint'],
  'criterion.create': ['config.changed', 'sync.hint'],
  'criterion.patch': ['config.changed', 'sync.hint'],
  'criterion.delete': ['config.changed', 'sync.hint'],
  'penaltyType.create': ['config.changed', 'sync.hint'],
  'penaltyType.patch': ['config.changed', 'sync.hint'],
  'penaltyType.delete': ['config.changed', 'sync.hint'],
  'entry.create': ['config.changed', 'results.updated', 'progress.updated', 'sync.hint'],
  'entry.patch': ['config.changed', 'sync.hint'],
  'entry.withdraw': ['config.changed', 'results.updated', 'progress.updated', 'sync.hint'],
  'entry.restore': ['config.changed', 'results.updated', 'progress.updated', 'sync.hint'],
  'entry.delete': ['config.changed', 'results.updated', 'sync.hint'],
  'judge.create': ['judges.changed', 'results.updated', 'progress.updated', 'sync.hint'],
  'judge.patch': ['judges.changed', 'sync.hint'],
  'judge.deactivate': ['judges.changed', 'session.revoked', 'results.updated', 'sync.hint'],
  'judge.resetPin': ['judges.changed', 'session.revoked', 'sync.hint'],
  'judge.delete': ['judges.changed', 'sync.hint'],
  'device.pair': ['device.paired'],
  'device.rename': ['device.status'],
  'device.heartbeat': ['device.status'],
  'device.revoke': ['session.revoked'],
  'judgeSession.replace': ['session.revoked'],
  'push.submit': ['scoresheet.accepted', 'results.updated', 'progress.updated', 'sync.hint'],
  'push.rejected': ['rejected.created'],
  'push.pinLocked': ['judges.changed', 'sync.hint'],
  'rejected.accept': ['scoresheet.accepted', 'results.updated', 'progress.updated', 'sync.hint'],
} as const satisfies Record<string, readonly ServerEventName[]>;

export type CommandName = keyof typeof COMMAND_EVENTS;
