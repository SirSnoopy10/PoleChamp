import { StyleSheet } from 'react-native';
import { renderWithProviders, screen } from '../../../test-utils/render';
import { catalogSections } from '../registry';
import '../sections';

/**
 * TC-A11Y-006 (IMP-460): każdy element interaktywny komponentów bazowych ma strefę dotyku ≥ 44 × 44 dp
 * (wymiary ze stylu + `hitSlop`). Sprawdzane na przypadkach DevCatalog; wymiary nieznane ze stylu
 * (rozciągane przez układ) są pomijane – pokrywa je przegląd ręczny na urządzeniu.
 */
const MIN = 44;
const ROLES = new Set(['button', 'checkbox', 'switch', 'radio', 'adjustable', 'tab', 'link']);
// Sekcje ekranów (org, judge, auth, tournaments) wymagają danych i nawigacji – zakres TC-A11Y-004/005.
const COMPONENT_SECTIONS = ['buttons', 'status', 'cards', 'sheets', 'forms', 'feedback', 'layout'];

type Slop = number | { top?: number; bottom?: number; left?: number; right?: number } | undefined;

function extent(size: unknown, slopA: number, slopB: number): number | null {
  return typeof size === 'number' ? size + slopA + slopB : null;
}

function targetOf(node: { props: Record<string, any> }) {
  const style = StyleSheet.flatten(node.props.style) ?? {};
  const slop = node.props.hitSlop as Slop;
  const s = typeof slop === 'number' ? { top: slop, bottom: slop, left: slop, right: slop } : (slop ?? {});
  return {
    width: extent(style.width ?? style.minWidth, s.left ?? 0, s.right ?? 0),
    height: extent(style.height ?? style.minHeight, s.top ?? 0, s.bottom ?? 0),
  };
}

const cases = catalogSections()
  .filter((s) => COMPONENT_SECTIONS.includes(s.id))
  .flatMap((s) => s.cases.map((c) => ({ section: s.id, id: c.id, render: c.render })));

describe('cele dotykowe (IMP-460)', () => {
  it.each(cases)('TC-A11Y-006: $section/$id – elementy interaktywne ≥ 44 dp', async ({ render }) => {
    await renderWithProviders(<>{render()}</>);
    const small: string[] = [];
    const nodes = [...ROLES].flatMap((role) =>
      screen.queryAllByRole(role as 'button', { includeHiddenElements: true }),
    );
    for (const node of nodes) {
      const { width, height } = targetOf(node);
      if ((width !== null && width < MIN) || (height !== null && height < MIN)) {
        small.push(
          `${node.props.testID ?? node.props.accessibilityLabel ?? node.props.accessibilityRole}: ${width}×${height}`,
        );
      }
    }
    expect(small).toEqual([]);
  });
});
