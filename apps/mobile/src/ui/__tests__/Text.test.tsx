import { fontFamily, typography } from '@polechamp/tokens';
import { renderWithProviders, screen } from '../../test-utils/render';
import { Text } from '../Text';

describe('Text (IMP-202)', () => {
  it('TC-TOKENS-004: warianty używają tylko Inter 400/500, liczby z tabular-nums', async () => {
    const variants = Object.keys(typography) as (keyof typeof typography)[];
    await renderWithProviders(
      <>
        {variants.map((v) => (
          <Text key={v} variant={v} testID={v}>
            {v}
          </Text>
        ))}
      </>,
    );
    for (const v of variants) {
      const el = screen.getByTestId(v);
      expect([fontFamily.regular, fontFamily.medium]).toContain(el.props.style[0].fontFamily);
      expect(el).toHaveStyle({ fontSize: typography[v].fontSize, lineHeight: typography[v].lineHeight });
    }
    expect(screen.getByTestId('numXL')).toHaveStyle({ fontVariant: ['tabular-nums'] });
  });

  it('limit skalowania czcionki: organizator 1,3, sędzia 1,2', async () => {
    const { unmount } = await renderWithProviders(<Text testID="t">A</Text>);
    expect(screen.getByTestId('t').props.maxFontSizeMultiplier).toBe(1.3);
    await unmount();
    await renderWithProviders(<Text testID="j">B</Text>, { mode: 'judge' });
    expect(screen.getByTestId('j').props.maxFontSizeMultiplier).toBe(1.2);
  });
});
