import { act } from 'react';
import { fireEvent, renderWithProviders, screen, userEvent } from '../../test-utils/render';
import { TournamentCard } from '../cards/TournamentCard';
import { EmptyState } from '../EmptyState';
import { ListRow } from '../list/GroupedList';
import { Skeleton } from '../Skeleton';

describe('karty, listy, stany puste, szkielety (IMP-205)', () => {
  it('TC-UI-005: chevron i onPress tylko dla wierszy edytowalnych', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <>
        <ListRow testID="edit" title="Technika" onPress={onPress} />
        <ListRow testID="ro" title="Artyzm" onPress={onPress} inactive />
      </>,
    );
    expect(screen.getAllByTestId('row-chevron', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByTestId('edit')).toHaveProp('accessibilityRole', 'button');
    // userEvent: fireEvent szukałby `onPress` także w propsach komponentu złożonego ListRow.
    const user = userEvent.setup();
    expect(screen.getByTestId('ro')).not.toHaveProp('accessibilityRole', 'button');
    await user.press(screen.getByTestId('ro'));
    expect(onPress).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('edit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('TC-UI-016: wariant ramki tapowalny z etykietą tekstu', async () => {
    const onPress = jest.fn();
    const text = 'Brak kategorii. Dodaj pierwszą, aby zacząć.';
    await renderWithProviders(
      <EmptyState variant="framed" icon="squares-four" text={text} onPress={onPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: text }));
    expect(onPress).toHaveBeenCalled();
  });

  it('TC-UI-017: Skeleton statyczny przy „Ogranicz ruch”', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<Skeleton height={20} />, { reducedMotion: true });
    const before = screen.getByTestId('skeleton', { includeHiddenElements: true });
    await act(async () => jest.advanceTimersByTime(1200));
    expect(before).toHaveAnimatedStyle({ opacity: 0.65 });
    jest.useRealTimers();
  });

  it('TC-UI-028: TournamentCard – jeden element dostępności z pełną etykietą', async () => {
    await renderWithProviders(
      <TournamentCard
        name="Mistrzostwa Polski Pole Sport 2026"
        status="live"
        date="3–4 października 2026"
        place="Warszawa, Hala Torwar"
        categories={6}
        pct={80}
        onPress={() => undefined}
      />,
    );
    expect(
      screen.getByRole('button', {
        name: 'Mistrzostwa Polski Pole Sport 2026, Trwa, 3–4 października 2026, Warszawa, Hala Torwar, postęp 80 procent',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('6 kategorii · 80%')).toBeOnTheScreen();
  });
});
