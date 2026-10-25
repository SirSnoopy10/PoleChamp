import { measureRenders } from 'reassure';
import { Providers } from '../../test-utils/render';
import { Button } from '../Button';

// Reassure (IMP-201): `pnpm --filter @polechamp/mobile perf:test` porównuje czas renderu z gałęzią bazową.
test('Button – render 20 przycisków', async () => {
  await measureRenders(
    <Providers>
      {Array.from({ length: 20 }, (_, i) => (
        <Button key={i} label={`Przycisk ${i}`} icon="plus" />
      ))}
    </Providers>,
  );
});
