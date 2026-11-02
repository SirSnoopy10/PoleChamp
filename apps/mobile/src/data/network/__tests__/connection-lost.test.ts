import { network } from '../online';

describe('stan sieci (IMP-752)', () => {
  afterEach(() => network.reset());

  it('UX2-10: utrata łączności z systemu – offline od razu, także przy WebSocket', () => {
    network.setWsConnected(true);
    network.reportHttpSuccess();
    expect(network.isOnline()).toBe(true);
    network.reportConnectionLost();
    expect(network.isOnline()).toBe(false);
  });

  it('UX2-10: krótki zanik przy żywym gnieździe – po powrocie online bez zdarzenia connect', () => {
    network.setWsConnected(true);
    network.reportConnectionLost();
    network.reportConnectionBack();
    expect(network.isOnline()).toBe(true);
  });

  it('UX2-10: odpowiedź serwera kasuje błędny „brak łączności” z systemu', () => {
    network.reportConnectionLost();
    network.reportHttpSuccess();
    expect(network.isOnline()).toBe(true);
  });
});
