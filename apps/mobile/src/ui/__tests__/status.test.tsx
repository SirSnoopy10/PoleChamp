import { View } from 'react-native';
import { renderWithProviders, screen } from '../../test-utils/render';
import { Avatar, initialsOf } from '../Avatar';
import { Badge } from '../Badge';
import { ProgressBar } from '../ProgressBar';
import { StatusPill } from '../StatusPill';

describe('StatusPill, Badge, Avatar, ProgressBar (IMP-204)', () => {
  it('TC-UI-002: etykiety wariantów, jedna linia, brak roli przycisku', async () => {
    await renderWithProviders(
      <View style={{ width: 60 }}>
        {(['draft', 'live', 'done', 'provisional', 'unplayed'] as const).map((v) => (
          <StatusPill key={v} variant={v} />
        ))}
      </View>,
    );
    for (const label of ['W przygotowaniu', 'Trwa', 'Zakończona', 'wstępny', 'Nierozegrana']) {
      expect(screen.getByText(label)).toHaveProp('numberOfLines', 1);
    }
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('TC-UI-003: formatowanie odznak', async () => {
    await renderWithProviders(
      <>
        <Badge variant="weight" value={15} />
        <Badge variant="penalty" value={5} />
        <Badge variant="number" value={47} />
        <Badge variant="scored" />
      </>,
    );
    expect(screen.getByText('×1,5')).toBeOnTheScreen();
    expect(screen.getByText('−0,5 pkt')).toBeOnTheScreen();
    expect(screen.getByText('47')).toBeOnTheScreen();
    expect(screen.getByText('Oceniono')).toBeOnTheScreen();
    expect(screen.getByTestId('icon-check-circle', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('TC-UI-004: ProgressBar – rola i wartość', async () => {
    await renderWithProviders(<ProgressBar value={0.67} label="30/45 ocen" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toMatchObject({ now: 67, min: 0, max: 100 });
    expect(bar).toHaveAccessibleName('30/45 ocen');
  });

  it('TC-UI-023: inicjały', async () => {
    expect(initialsOf('Katarzyna Nowak')).toBe('KN');
    expect(initialsOf('Anna Maria Kowalska-Nowak')).toBe('AMK');
    expect(initialsOf('Ola')).toBe('O');
    await renderWithProviders(<Avatar name="Katarzyna Nowak" initials="KaN" />);
    expect(screen.getByText('KaN')).toBeOnTheScreen();
  });
});
