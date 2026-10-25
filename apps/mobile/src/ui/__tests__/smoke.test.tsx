import { sheetTotal } from '@polechamp/scoring';
import { typography } from '@polechamp/tokens';
import { openDatabaseSync } from 'expo-sqlite';
import { migrate, MIGRATIONS } from '../../db/migrations';
import { renderWithProviders, screen } from '../../test-utils/render';
import { Text } from '../Text';

describe('środowisko testów mobile (IMP-201)', () => {
  it('TC-SCORING-031: aplikacja importuje silnik punktacji z workspace', () => {
    expect(typeof sheetTotal).toBe('function');
  });

  it('renderuje Text ze stylem z tokenów', async () => {
    await renderWithProviders(<Text variant="heading">Turnieje</Text>);
    expect(screen.getByText('Turnieje')).toHaveStyle({ fontSize: typography.heading.fontSize });
  });

  it('mock SQLite stosuje migracje aplikacji', () => {
    const db = openDatabaseSync('test.db');
    expect(migrate(db)).toBe(MIGRATIONS.length);
    db.runSync('INSERT INTO meta (key, value) VALUES (?, ?)', 'k', 'v');
    expect(
      db.getFirstSync<{ value: string }>('SELECT value FROM meta WHERE key = $key', { $key: 'k' }),
    ).toEqual({
      value: 'v',
    });
    expect(migrate(db)).toBe(MIGRATIONS.length);
  });
});
