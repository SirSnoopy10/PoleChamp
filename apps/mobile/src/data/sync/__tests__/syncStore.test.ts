import { network } from '../../network/online';
import { LocalDb } from '../../local/LocalDb';
import { submitSheet } from '../submit';
import {
  refreshFromDb,
  resetSyncStore,
  selectEntrySyncState,
  selectSyncPillState,
  syncStore,
  type SyncState,
} from '../syncStore';

const state = (over: Partial<SyncState>): SyncState => ({ ...syncStore.getState(), ...over });

describe('magazyn stanu synchronizacji (IMP-358)', () => {
  afterEach(() => {
    network.reset();
    resetSyncStore();
  });

  it('TC-STATE-003: maszyna stanów pigułki', () => {
    expect(selectSyncPillState(state({ online: true, pending: 0 }))).toEqual({ kind: 'synced' });
    expect(selectSyncPillState(state({ online: true, pending: 3 }))).toEqual({ kind: 'sending', count: 3 });
    expect(selectSyncPillState(state({ online: false, pending: 3 }))).toEqual({
      kind: 'offlineQueue',
      count: 3,
    });
    expect(selectSyncPillState(state({ online: false, pending: 0 }))).toEqual({ kind: 'offline' });
    expect(selectSyncPillState(state({ online: true, pending: 1, maxAttempts: 20 }))).toEqual({
      kind: 'attention',
    });
    expect(selectSyncPillState(state({ online: false, rejected: 1 }))).toEqual({ kind: 'attention' });
  });

  it('TC-STATE-003: zablokowany WS i udane HTTP < 60 s – nie „Offline”', () => {
    jest.useFakeTimers({ now: 0 });
    try {
      network.setWsConnected(false);
      network.reportHttpSuccess(Date.now());
      expect(syncStore.getState().online).toBe(true);
      expect(selectSyncPillState(syncStore.getState())).toEqual({ kind: 'synced' });
      jest.advanceTimersByTime(60_000);
      expect(selectSyncPillState(syncStore.getState())).toEqual({ kind: 'offline' });
      network.setWsConnected(true);
      expect(syncStore.getState().online).toBe(true);
    } finally {
      network.reset();
      jest.useRealTimers();
    }
  });

  it('przejścia online → offline z kolejką → wysyłanie → zsynchronizowano (z bazy)', async () => {
    const local = LocalDb.open('test.db');
    try {
      network.setWsConnected(true);
      refreshFromDb(local.read, 'jA');
      expect(selectSyncPillState(syncStore.getState()).kind).toBe('synced');

      network.setWsConnected(false);
      await submitSheet(local, {
        judgeId: 'jA',
        judgeSessionId: '0199c000-0000-7000-8000-000000000001',
        authMode: 'OFFLINE_PIN',
        categoryId: 'c1',
        entryId: 'e1',
        criteria: [{ criterionId: 'k1', valueTenths: 80 }],
        penalties: [],
        comment: '',
        totalHundredths: 800,
      });
      refreshFromDb(local.read, 'jA');
      expect(selectSyncPillState(syncStore.getState())).toEqual({ kind: 'offlineQueue', count: 1 });
      expect(selectEntrySyncState('e1')(syncStore.getState())).toBe('pending');
      expect(selectEntrySyncState('e2')(syncStore.getState())).toBe('none');

      network.setWsConnected(true);
      expect(selectSyncPillState(syncStore.getState())).toEqual({ kind: 'sending', count: 1 });

      await local.tx((db) => {
        db.runSync("UPDATE outbox SET state = 'DONE'");
        db.runSync("UPDATE local_score_sheet SET sync_state = 'SYNCED'");
      });
      refreshFromDb(local.read, 'jA');
      expect(selectSyncPillState(syncStore.getState())).toEqual({ kind: 'synced' });
      expect(selectEntrySyncState('e1')(syncStore.getState())).toBe('synced');
    } finally {
      local.close();
    }
  });
});
