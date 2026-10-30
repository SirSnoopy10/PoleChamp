import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../query/keys';
import { bindOrgEvents } from '../orgBindings';
import type { RtSocket } from '../socket';

describe('bindOrgEvents (IMP-753)', () => {
  it('UX2-41: judges.changed unieważnia kategorie, sędziów i turniej', () => {
    const handlers = new Map<string, () => void>();
    const socket = { on: (e: string, h: () => void) => handlers.set(e, h), off: () => undefined };
    const client = new QueryClient();
    const spy = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
    bindOrgEvents(socket as unknown as RtSocket, client, 't1');
    handlers.get('judges.changed')?.();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['category'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.judges('t1') });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.tournament('t1') });
  });
});
