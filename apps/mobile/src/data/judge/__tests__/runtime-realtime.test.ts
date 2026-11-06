import { EventEmitter } from 'node:events';
import type { LocalDb } from '../../local/LocalDb';
import { fakeApi, json, openTestDb } from '../../../test-utils/sync';
import { createJudgeRuntime, type JudgeRuntime } from '../runtime';

/** Atrapa gniazda Socket.IO: zapisuje emisje (np. `subscribe`), `serverEmit` – zdarzenie serwera. */
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
  serverEmit(event: string) {
    if (event === 'connect') this.connected = true;
    return super.emit(event);
  }
}

describe('JudgeRuntime – realtime po ponownym parowaniu', () => {
  let local: LocalDb;
  let rt: JudgeRuntime;
  const sockets: FakeSocket[] = [];

  beforeEach(() => {
    local = openTestDb();
    sockets.length = 0;
    rt = createJudgeRuntime({
      local,
      api: fakeApi(async () => json({})).api,
      connectSocket: (() => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      }) as never,
    });
  });
  afterEach(() => {
    rt.dispose();
    local.close();
  });

  it('ten sam turniej – jedno gniazdo; inny turniej („Sparuj z nowym turniejem”) – nowa subskrypcja', () => {
    rt.connectRealtime('t1');
    rt.connectRealtime('t1');
    expect(sockets).toHaveLength(1);

    rt.connectRealtime('t2');
    expect(sockets).toHaveLength(2);
    expect(sockets[0]!.disconnect).toHaveBeenCalled();
    sockets[1]!.serverEmit('connect');
    expect(sockets[1]!.emitted).toContainEqual(['subscribe', { tournamentId: 't2' }]);
  });
});
