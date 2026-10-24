import type { ExportCategory, ExportData } from '../../src/modules/exports/export-data.service.js';

/** Zamrożony czas wygenerowania (TC-PDF-009): 3.10.2026 18:30 w Warszawie. */
export const FROZEN_AT = new Date('2026-10-03T16:30:00Z');

const FIRST = ['Natalia', 'Zuzanna', 'Agnieszka', 'Lena', 'Maja', 'Julia', 'Oliwia', 'Hanna', 'Łucja'];
const LAST = ['Kamińska', 'Król', 'Mazur', 'Wójcik', 'Zielińska', 'Sikora', 'Dąbrowska', 'Żak', 'Świątek'];
const CLUBS = ['Studio Vertical Wrocław', 'PoleFit Kraków', 'Aerial Dreams Warszawa', 'Łódź Pole Studio'];

const display = (h: number) => (h / 100).toFixed(2).replace('.', ',');

function category(
  index: number,
  entries: number,
  status: ExportCategory['status'] = 'IN_PROGRESS',
): ExportCategory {
  const id = `00000000-0000-7000-8000-${String(index).padStart(12, '0')}`;
  const rows = Array.from({ length: entries }, (_, i) => {
    const n = 41 + i;
    const withdrawn = i === entries - 1 && entries > 3;
    const scored = i < entries - 2;
    const official = 5_570 - i * 45;
    return {
      entryId: `${id.slice(0, -4)}${String(i).padStart(4, '0')}`,
      rank: scored && !withdrawn ? i + 1 : null,
      startNumber: n,
      fullName: `${FIRST[i % 9]} ${LAST[(i + index) % 9]}`,
      club: CLUBS[i % 4] ?? null,
      entryStatus: withdrawn ? ('WITHDRAWN' as const) : ('ACTIVE' as const),
      official: scored && !withdrawn ? official / 100 : null,
      display: scored && !withdrawn ? display(official) : '—',
      sheetCount: scored ? (i === 2 ? 3 : 5) : 0,
      isComplete: scored && i !== 2,
      isProvisional: status === 'LOCKED' && i === 2,
      tieBreak: null,
    };
  });
  return {
    categoryId: id,
    name: index === 1 ? 'Pole Sport Advanced' : `Pole Sport Kategoria ${index}`,
    status,
    resultsVersion: 30 + index,
    maxJudgeScore: 65,
    judgeCount: 5,
    formula: 'MEAN',
    tieBreak: null,
    rows,
  };
}

function data(categories: ExportCategory[]): ExportData {
  return {
    tournament: {
      id: '00000000-0000-7000-8000-000000000001',
      ownerId: '00000000-0000-7000-8000-000000000002',
      name: 'Mistrzostwa Polski Pole Sport 2026',
      startDate: '2026-10-03',
      endDate: '2026-10-04',
      venue: 'Warszawa, Hala Torwar',
      timezone: 'Europe/Warsaw',
      status: 'IN_PROGRESS',
      startedAt: null,
      finishedAt: null,
      allowOfflinePinLogin: true,
      changeSeq: 0,
      version: 1,
      deletedAt: null,
      createdAt: FROZEN_AT,
      updatedAt: FROZEN_AT,
    },
    categories,
    versions: Object.fromEntries(categories.map((c) => [c.categoryId, c.resultsVersion])),
    hash: 'a3f9c2e1b4d5'.padEnd(64, '0'),
  };
}

/** FX-T1C3: kategoria c3 zablokowana, 9 startów (wyniki wstępne, brak ocen, wycofana). */
export const fxCategory = () => data([category(1, 9, 'LOCKED')]);

/** Turniej z trzema kategoriami i nierozegraną. */
export const fxTournament = () =>
  data([
    category(1, 9, 'LOCKED'),
    category(2, 12),
    category(3, 6),
    { ...category(4, 0, 'DRAFT'), unplayed: true },
  ]);

/** FX-MAX: 60 kategorii, 1 500 startów (NFR-107). */
export const fxMax = () => data(Array.from({ length: 60 }, (_, i) => category(i + 1, 25)));
