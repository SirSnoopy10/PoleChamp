import { EventEmitter } from 'node:events';
import { QueryClient } from '@tanstack/react-query';
import type { TournamentDetails } from '@polechamp/contracts';
import { network } from '../../network/online';
import { queryKeys } from '../../query/keys';
import { bindJudgeEvents, type SyncEngineHooks } from '../judgeBindings';
import { bindOrgEvents } from '../orgBindings';
import { createRealtimeClient, FALLBACK_AFTER_MS, type RtSocket } from '../socket';

/** Atrapa gniazda Socket.IO: `serverEmit` symuluje zdarzenie serwera. */
class FakeSocket extends EventEmitter {
  connected = false;
  emitted: [string, unknown][] = [];
  connect = jest.fn(() => this);
  disconnect = jest.fn(() => {
    this.connected = false;
    return this;
  });
  override emit(event: string, ...args: unknown[]): boolean {
    this.emitted.push([event, args[0]]);
    return true;
  }
  serverEmit(event: string, payload?: unknown) {
    if (event === 'connect') this.connected = true;
    if (event === 'disconnect') this.connected = false;
    return super.emit(event, payload);
  }
}

const asSocket = (s: FakeSocket) => s as unknown as RtSocket;

function setup() {
  const socket = new FakeSocket();
  let appListener: ((s: string) => void) | null = null;
  const onPollingChange = jest.fn();
  const onResync = jest.fn();
  const refreshToken = jest.fn(async () => undefined);
  const client = createRealtimeClient({
    url: 'http://api.test',
    tournamentId: 't1',
    getToken: () => 'tok',
    refreshToken,
    onPollingChange,
    onResync,
    connect: (() => socket) as never,
    appState: {
      addEventListener: (_e: string, l: (s: string) => void) => {
        appListener = l;
        return { remove: () => undefined };
      },
    } as never,
  });
  return {
    socket,
    client,
    onPollingChange,
    onResync,
    refreshToken,
    foreground: () => appListener?.('active'),
  };
}

const details = (): TournamentDetails =>
  ({
    id: 't1',
    progress: { done: 0, expected: 10, percent: 0, startedCategories: 1 },
    categories: [{ id: 'c1', progress: { done: 0, expected: 10, percent: 0 } }],
  }) as unknown as TournamentDetails;

describe('klient realtime (IMP-216)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    network.reset();
  });

  it('subscribe po połączeniu, stan online z WebSocket', () => {
    const { socket, client } = setup();
    socket.serverEmit('connect');
    expect(socket.emitted).toContainEqual(['subscribe', { tournamentId: 't1' }]);
    expect(network.isOnline()).toBe(true);
    client.close();
  });

  it('TC-SYNC-027: brak WS przez 20 s → odpytywanie, po odzyskaniu WS powrót i odświeżenie', () => {
    const { socket, onPollingChange, onResync, client } = setup();
    jest.advanceTimersByTime(FALLBACK_AFTER_MS - 1);
    expect(onPollingChange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onPollingChange).toHaveBeenLastCalledWith(true);
    socket.serverEmit('connect');
    expect(onPollingChange).toHaveBeenLastCalledWith(false);
    expect(onResync).toHaveBeenCalledTimes(1);
    client.close();
  });

  it('auth.expired → odświeżenie tokenu i ponowne połączenie; powrót z tła → resync', async () => {
    const { socket, refreshToken, onResync, foreground, client } = setup();
    socket.serverEmit('connect');
    socket.serverEmit('auth.expired');
    expect(socket.disconnect).toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();
    expect(refreshToken).toHaveBeenCalled();
    expect(socket.connect).toHaveBeenCalled();
    foreground();
    expect(onResync).toHaveBeenCalled();
    client.close();
  });

  it('organizator: progress bez zapytania, results unieważnia, starsze wersje ignorowane', () => {
    const socket = new FakeSocket();
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.tournament('t1'), details());
    const invalidate = jest.spyOn(qc, 'invalidateQueries');
    bindOrgEvents(asSocket(socket), qc, 't1');

    socket.serverEmit('progress.updated', {
      tournamentId: 't1',
      done: 5,
      expected: 10,
      categoryId: 'c1',
      categoryDone: 5,
      categoryExpected: 10,
    });
    const after = qc.getQueryData<TournamentDetails>(queryKeys.tournament('t1'));
    expect(after?.progress).toMatchObject({ done: 5, percent: 50 });
    expect(after?.categories[0]?.progress).toMatchObject({ done: 5, percent: 50 });
    expect(invalidate).not.toHaveBeenCalled();

    socket.serverEmit('results.updated', { categoryId: 'c1', resultsVersion: 3 });
    socket.serverEmit('results.updated', { categoryId: 'c1', resultsVersion: 2 });
    socket.serverEmit('results.updated', { categoryId: 'c1', resultsVersion: 3 });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.results('c1') });

    socket.serverEmit('device.status', { deviceId: 'd1' });
    expect(invalidate).toHaveBeenLastCalledWith({ queryKey: queryKeys.devices('t1') });
    socket.serverEmit('rejected.created', { rejectedId: 'r1', categoryId: 'c1', judgeId: 'j1' });
    expect(invalidate).toHaveBeenLastCalledWith({ queryKey: queryKeys.rejected('t1') });
    qc.clear();
  });

  it('TC-SYNC-018 (aplikacja): tablet – sync.hint tylko z nowszym kursorem, blokada natychmiast', () => {
    const socket = new FakeSocket();
    const engine: jest.Mocked<SyncEngineHooks> = {
      pull: jest.fn(),
      cursor: jest.fn(() => 10),
      lockCategory: jest.fn(),
      unlockCategory: jest.fn(),
      onSessionRevoked: jest.fn(),
    };
    bindJudgeEvents(asSocket(socket), engine);
    socket.serverEmit('sync.hint', { cursor: 9 });
    expect(engine.pull).not.toHaveBeenCalled();
    socket.serverEmit('sync.hint', { cursor: 11 });
    expect(engine.pull).toHaveBeenCalledTimes(1);
    socket.serverEmit('category.locked', { categoryId: 'c1', lockedAt: '2026-10-03T14:02:11Z' });
    expect(engine.lockCategory).toHaveBeenCalledWith('c1');
    socket.serverEmit('config.changed', { categoryId: 'c1', scope: 'criteria' });
    socket.serverEmit('judges.changed', { judgeIds: ['j1'] });
    expect(engine.pull).toHaveBeenCalledTimes(4);
    socket.serverEmit('session.revoked', { reason: 'DEVICE_REVOKED' });
    expect(engine.onSessionRevoked).toHaveBeenCalledWith({ reason: 'DEVICE_REVOKED' });
  });
});
