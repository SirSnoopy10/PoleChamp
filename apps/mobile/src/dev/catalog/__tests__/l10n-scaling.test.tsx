import { I18nProvider } from '../../../i18n';
import { MAX_FONT_SCALE } from '../../../mode/mode';
import { renderWithProviders, screen } from '../../../test-utils/render';
import { catalogSections } from '../registry';
import '../sections';

/**
 * IMP-504: przebieg pseudolokalizacji (+40%) i skalowania tekstu na przypadkach DevCatalog.
 * - TC-L10N-002 / UI-11: tekst w przyciskach, zakładkach, pigułkach i plakietkach ma jedną linię
 *   (`numberOfLines = 1` – wielokropek zamiast zawijania);
 * - TC-A11Y-007/008 / NFR-204: każdy tekst ma limit skalowania trybu (organizator 130%, sędzia 120%).
 * Obcięcia widoczne dopiero na ekranie (układ) – przegląd ręczny: docs-dev/qa/l10n-scaling.md.
 */
const COMPONENT_SECTIONS = ['buttons', 'status', 'cards', 'sheets', 'forms', 'feedback', 'layout'];
const SINGLE_LINE_ROLES = new Set(['button', 'tab', 'link', 'switch', 'checkbox', 'radio']);
const SINGLE_LINE_TESTID = /(pill|badge|chip|segment)/i;
// Klikalne elementy z treścią wielowierszową wg designu: komunikat banera, pusty stan z ramką.
const MULTILINE_ALLOWED = /^(banner|empty)/;

interface HostNode {
  type: unknown;
  props: Record<string, any>;
  children: (HostNode | string)[];
}

const texts = (node: HostNode): HostNode[] =>
  node.type === 'Text' ? [node] : node.children.flatMap((c) => (typeof c === 'string' ? [] : texts(c)));

const label = (t: HostNode) => t.children.filter((c) => typeof c === 'string').join('');

/**
 * Teksty jednowierszowe bez `numberOfLines = 1`: jedyny tekst elementu interaktywnego (etykieta
 * przycisku, zakładki, przełącznika) oraz każdy tekst pigułki / plakietki / segmentu (testID).
 * Karty z wieloma tekstami (tytuł, meta) mogą zawijać – zgodnie z designem.
 */
function wrappingTexts(node: HostNode, out: string[] = []): string[] {
  const role = node.props.accessibilityRole ?? node.props.role;
  const inner =
    SINGLE_LINE_ROLES.has(role) || SINGLE_LINE_TESTID.test(node.props.testID ?? '') ? texts(node) : [];
  const checked = SINGLE_LINE_TESTID.test(node.props.testID ?? '') ? inner : inner.length === 1 ? inner : [];
  const where = node.props.testID ?? role;
  if (MULTILINE_ALLOWED.test(node.props.testID ?? '')) return out;
  for (const t of checked) {
    if (label(t).trim() && t.props.numberOfLines !== 1) out.push(`${where}: ${label(t)}`);
  }
  for (const child of node.children) if (typeof child !== 'string') wrappingTexts(child, out);
  return out;
}

const cases = catalogSections()
  .filter((s) => COMPONENT_SECTIONS.includes(s.id))
  .flatMap((s) => s.cases.map((c) => ({ section: s.id, id: c.id, render: c.render })));

describe('pseudolokalizacja i skalowanie tekstu (IMP-504)', () => {
  it.each(cases)('TC-L10N-002: $section/$id – przyciski i pigułki bez zawijania', async ({ render }) => {
    await renderWithProviders(<I18nProvider pseudo>{render()}</I18nProvider>);
    expect(wrappingTexts(screen.root as unknown as HostNode)).toEqual([]);
  });

  it.each(['org', 'judge'] as const)(
    'TC-A11Y-007/008: tryb %s – limit skalowania czcionki na każdym tekście',
    async (mode) => {
      const over: string[] = [];
      let checked = 0;
      for (const c of cases) {
        const view = await renderWithProviders(<>{c.render()}</>, { mode });
        for (const t of texts(screen.root as unknown as HostNode)) {
          checked++;
          const max = t.props.maxFontSizeMultiplier as number | undefined;
          if (t.props.allowFontScaling !== false && (max === undefined || max > MAX_FONT_SCALE[mode])) {
            over.push(`${c.section}/${c.id}: ${label(t).slice(0, 30)} (${max})`);
          }
        }
        await view.unmount();
      }
      expect(checked).toBeGreaterThan(100);
      expect(over).toEqual([]);
    },
  );

  it('UX-08 / UX-20: żaden wyrenderowany tekst katalogu (komponenty i ekrany) nie zawiera surowej {zmiennej}', async () => {
    const raw: string[] = [];
    const all = catalogSections().flatMap((sec) =>
      sec.cases.map((c) => ({ section: sec.id, id: c.id, render: c.render })),
    );
    let rendered = 0;
    const silence = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const c of all) {
      // Ekrany z hookami Expo Router (useFocusEffect) wymagają drzewa tras – pomijane.
      const view = await renderWithProviders(<>{c.render()}</>).catch(() => null);
      if (!view) continue;
      rendered++;
      for (const t of texts(screen.root as unknown as HostNode)) {
        if (/\{[A-Za-z]\w*\}/.test(label(t))) raw.push(`${c.section}/${c.id}: ${label(t)}`);
      }
      await view.unmount();
    }
    silence.mockRestore();
    expect(rendered).toBeGreaterThan(50);
    expect(raw).toEqual([]);
  });
});
