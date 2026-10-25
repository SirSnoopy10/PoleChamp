import type { ReactNode } from 'react';

/** Przypadek DevCatalog (IMP-212): `testID` = `catalog-<sekcja>-<id>`, deep link `?case=<id>`. */
export interface CatalogCase {
  id: string;
  title: string;
  render: () => ReactNode;
}

export interface CatalogSection {
  id: string;
  title: string;
  cases: CatalogCase[];
}

const sections = new Map<string, CatalogSection>();

/** Rejestruje sekcję katalogu; plik `*.catalog.tsx` komponentu wywołuje to przy imporcie. */
export function registerSection(section: CatalogSection): void {
  sections.set(section.id, section);
}

export const catalogSections = (): CatalogSection[] => [...sections.values()];
export const catalogSection = (id: string): CatalogSection | undefined => sections.get(id);
export const caseTestId = (section: string, id: string) => `catalog-${section}-${id}`;
