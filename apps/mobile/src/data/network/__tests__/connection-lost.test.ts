import { network } from '../online';

describe('stan sieci (IMP-752)', () => {
  afterEach(() => network.reset());

  it('UX2-10: utrata łączności z systemu – offline od razu, także przy WebSocket', () => {
    network.setWsConnected(true);
    network.reportHttpSuccess();
    expect(network.isOnline()).toBe(true);
    network.reportConnectionLost();
    expect(network.isOnline()).toBe(false);
    expect(network.isWsConnected()).toBe(false);
  });
});
