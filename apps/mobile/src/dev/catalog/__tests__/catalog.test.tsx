import { isCatalogEnabled } from '../settings';
import { caseTestId, catalogSections } from '../registry';
import '../sections';

describe('DevCatalog (IMP-212)', () => {
  it('TC-SEC-018: katalog tylko w development i profilu preview', () => {
    expect(isCatalogEnabled(true, undefined)).toBe(true);
    expect(isCatalogEnabled(false, 'preview')).toBe(true);
    expect(isCatalogEnabled(false, 'production')).toBe(false);
    expect(isCatalogEnabled(false, undefined)).toBe(false);
  });

  it('TC-DESIGN-023: sekcje komponentów z unikalnymi testID przypadków', () => {
    const sections = catalogSections();
    expect(sections.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'typography',
        'buttons',
        'icons',
        'status',
        'cards',
        'sheets',
        'forms',
        'feedback',
        'layout',
        'splash',
      ]),
    );
    const ids = sections.flatMap((s) => s.cases.map((c) => caseTestId(s.id, c.id)));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
