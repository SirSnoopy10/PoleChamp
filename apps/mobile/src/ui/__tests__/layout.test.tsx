import { useState } from 'react';
import { Text } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';
import { CategoryActionBar, categoryActions } from '../../features/org/CategoryActionBar';
import { fireEvent, Providers, renderWithProviders, screen } from '../../test-utils/render';
import { ScreenContainer } from '../layout/ScreenContainer';
import { SegmentedControl } from '../SegmentedControl';

describe('rama ekranu (IMP-209)', () => {
  it('TC-UI-006: SegmentedControl – tablist, tab selected, licznik opacity 0,7', async () => {
    function Harness() {
      const [tab, setTab] = useState<'k' | 'u' | 'w'>('k');
      return (
        <SegmentedControl
          value={tab}
          onChange={setTab}
          segments={[
            { key: 'k', label: 'Kryteria', count: 5 },
            { key: 'u', label: 'Zawodniczki', count: 12 },
            { key: 'w', label: 'Wyniki' },
          ]}
        />
      );
    }
    await renderWithProviders(<Harness />);
    expect(screen.getByTestId('segmented')).toHaveProp('accessibilityRole', 'tablist');
    await fireEvent.press(screen.getByRole('tab', { name: 'Wyniki' }));
    expect(screen.getByRole('tab', { name: 'Wyniki' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Kryteria, 5' })).not.toBeSelected();
    expect(screen.getByTestId('segment-w')).toHaveStyle({ borderColor: '#5d5294' });
    expect(screen.getByTestId('segment-k-count')).toHaveStyle({ opacity: 0.7, fontSize: 11 });
  });

  it('TC-UI-024: akcje paska wg stanu kategorii i turnieju', async () => {
    expect(categoryActions('DRAFT', 'IN_PROGRESS')).toEqual(['start']);
    expect(categoryActions('IN_PROGRESS', 'IN_PROGRESS')).toEqual(['lock', 'exportPdf']);
    expect(categoryActions('LOCKED', 'IN_PROGRESS')).toEqual(['unlock', 'exportPdf']);
    expect(categoryActions('LOCKED', 'FINISHED')).toEqual(['exportPdf']);
    const onAction = jest.fn();
    await renderWithProviders(
      <CategoryActionBar category="IN_PROGRESS" tournament="IN_PROGRESS" onAction={onAction} />,
    );
    expect(screen.getByRole('button', { name: 'Zakończ i zablokuj' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Eksport PDF' }));
    expect(onAction).toHaveBeenCalledWith('exportPdf');
  });

  it('TC-DESIGN-010: safe area górna + 10 dp, pasek przyklejony nad wskaźnikiem domowym', async () => {
    await renderRouter(
      {
        index: () => (
          <Providers>
            <ScreenContainer footer={<Text>bar</Text>} footerHeight={100}>
              <Text>treść</Text>
            </ScreenContainer>
          </Providers>
        ),
      },
      { initialUrl: '/' },
    );
    const scroll = screen.getByTestId('screen-scroll');
    expect(scroll.props.contentContainerStyle).toMatchObject({ paddingTop: 47 + 10, paddingBottom: 116 });
    expect(scroll).toHaveProp('showsVerticalScrollIndicator', false);
  });
});
