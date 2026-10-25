import { words } from '@polechamp/i18n';
import { Text } from 'react-native';
import { renderWithProviders, screen } from '../../test-utils/render';
import { Plural, TournamentDate, useT } from '..';

function Keys() {
  const t = useT();
  return (
    <>
      <Text>{t('status.live')}</Text>
      <Text>{t('judge:queueCount', { count: 3 })}</Text>
      <Text>{t('card.categories', { count: 2, pct: 40 })}</Text>
    </>
  );
}

describe('i18n w aplikacji (IMP-219)', () => {
  it('klucze z @polechamp/i18n, przestrzeń domyślna ui i inne przez ns:klucz', async () => {
    await renderWithProviders(<Keys />);
    expect(screen.getByText('Trwa')).toBeOnTheScreen();
    expect(screen.getByText('Oceny w kolejce: 3')).toBeOnTheScreen();
    expect(screen.getByText('2 kategorie · 40%')).toBeOnTheScreen();
  });

  it('Plural i TournamentDate', async () => {
    await renderWithProviders(
      <>
        <Plural n={5} forms={words.score} />
        <Plural n={22} forms={words.category} />
        <TournamentDate start="2026-10-03" end="2026-10-04" />
        <TournamentDate start={null} />
      </>,
    );
    expect(screen.getByText('5 ocen')).toBeOnTheScreen();
    expect(screen.getByText('22 kategorie')).toBeOnTheScreen();
    expect(screen.getByText('3–4 października 2026')).toBeOnTheScreen();
    expect(screen.getByText('Data do ustalenia')).toBeOnTheScreen();
  });
});
