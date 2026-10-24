import { createI18n, formatTournamentDate } from '@polechamp/i18n';
import { color } from '@polechamp/tokens';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { ExportCategory, ExportData } from '../../export-data.service.js';

const i18n = createI18n();
const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, { ns: 'pdf', ...params });
const tc = (key: string, params?: Record<string, unknown>) => i18n.t(key, { ns: 'common', ...params });

/** Jasny wydruk (TL-27): wyniki accent-700, tekst pomocniczy neutral-700 na białym tle. */
export const PDF_COLORS = {
  text: '#1d1e26',
  result: color.accentRamp[700],
  muted: color.neutral[700],
  rule: color.neutral[300],
  header: color.accentRamp[100],
} as const;

/** „24.10.2026, 14:05” w strefie Europe/Warsaw. */
export function formatGeneratedAt(at: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
}

function categoryTable(c: ExportCategory): Content {
  const header: TableCell[] = (['rank', 'number', 'athlete', 'club', 'score', 'judges'] as const).map(
    (k) => ({
      text: t(`columns.${k}`),
      style: 'th',
      alignment: k === 'score' || k === 'judges' ? 'right' : 'left',
    }),
  );
  const body: TableCell[][] = c.rows.map((r) => {
    const withdrawn = r.entryStatus === 'WITHDRAWN';
    const score: TableCell = withdrawn
      ? { text: t('withdrawn'), color: PDF_COLORS.muted, alignment: 'right' }
      : {
          text: [
            { text: r.display, bold: true, color: PDF_COLORS.result },
            ...(r.isProvisional
              ? [{ text: ` ${t('provisional')}`, color: PDF_COLORS.muted, fontSize: 8 }]
              : []),
          ],
          alignment: 'right',
        };
    const judges =
      r.sheetCount === 0 && !withdrawn
        ? t('noScores')
        : tc('judgesCount', { n: r.sheetCount, total: c.judgeCount });
    return [
      { text: withdrawn || r.rank === null ? '—' : String(r.rank) },
      { text: String(r.startNumber) },
      { text: r.fullName },
      { text: r.club ?? '', color: PDF_COLORS.muted },
      score,
      { text: withdrawn ? '' : judges, color: PDF_COLORS.muted, alignment: 'right', fontSize: 8 },
    ];
  });
  return {
    table: { headerRows: 1, widths: [22, 26, '*', '*', 70, 64], body: [header, ...body] },
    layout: {
      hLineWidth: (i: number) => (i === 1 ? 0.8 : 0.4),
      vLineWidth: () => 0,
      hLineColor: () => PDF_COLORS.rule,
      fillColor: (i: number) => (i === 0 ? PDF_COLORS.header : null),
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  };
}

function categorySection(c: ExportCategory, first: boolean): Content[] {
  return [
    {
      text: t('categoryTitle', { name: c.name, status: tc(`categoryStatus.${c.status}`) }),
      style: 'h2',
      pageBreak: first ? undefined : 'before',
    },
    { text: t('version', { version: c.resultsVersion }), style: 'muted' },
    categoryTable(c),
  ];
}

/**
 * Dokument wyników (ADR-009): nagłówek turnieju, tabela na kategorię, „Nie rozegrano: …”,
 * stopka z datą, statusem, wersją i skrótem; pełny skrót w metadanych.
 */
export function resultsDoc(
  data: ExportData,
  scope: 'TOURNAMENT' | 'CATEGORY',
  generatedAt: Date,
): TDocumentDefinitions {
  const { tournament: tr } = data;
  const played = data.categories.filter((c) => c.status !== 'DRAFT');
  const unplayed = data.categories.filter((c) => c.unplayed).map((c) => c.name);
  const place = [formatTournamentDate(tr.startDate, tr.endDate), tr.venue].filter(Boolean).join(' · ');
  const single = scope === 'CATEGORY' ? data.categories[0] : undefined;
  const status = single ? tc(`categoryStatus.${single.status}`) : tc(`tournamentStatus.${tr.status}`);
  const version = single
    ? single.resultsVersion
    : Math.max(0, ...data.categories.map((c) => c.resultsVersion));
  const footerLine = [
    t('generatedAt', { date: formatGeneratedAt(generatedAt) }),
    status,
    t('footer', { version, hash: data.hash.slice(0, 12) }),
  ].join(' · ');

  const body: Content[] = [];
  const sections = single ? [single] : played;
  sections.forEach((c, i) => body.push(...categorySection(c, i === 0)));
  if (!single && sections.length === 0) body.push({ text: t('noCategories'), style: 'muted' });
  if (!single && unplayed.length) {
    body.push({ text: t('unplayed', { names: unplayed.join(', ') }), style: 'note' });
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 90, 40, 70],
    info: {
      title: single ? `${tr.name} – ${single.name}` : tr.name,
      author: 'PoleChamp',
      creator: 'PoleChamp',
      subject: `SHA-256 ${data.hash}`,
      keywords: data.hash,
    },
    defaultStyle: { font: 'Inter', fontSize: 9.5, color: PDF_COLORS.text, lineHeight: 1.15 },
    styles: {
      brand: { fontSize: 8, color: PDF_COLORS.result, bold: true, characterSpacing: 1 },
      h1: { fontSize: 16, bold: true },
      h2: { fontSize: 12.5, bold: true, margin: [0, 6, 0, 2] },
      th: { bold: true, fontSize: 8.5 },
      muted: { color: PDF_COLORS.muted, fontSize: 8.5, margin: [0, 0, 0, 6] },
      note: { color: PDF_COLORS.muted, margin: [0, 14, 0, 0] },
    },
    header: () => ({
      margin: [40, 28, 40, 0],
      stack: [
        { text: 'POLECHAMP', style: 'brand' },
        { text: tr.name, style: 'h1' },
        { text: place, style: 'muted' },
      ],
    }),
    footer: (page: number, pages: number) => ({
      margin: [40, 16, 40, 0],
      fontSize: 7.5,
      color: PDF_COLORS.muted,
      stack: [
        {
          columns: [
            { text: footerLine },
            { text: t('page', { page, pages }), alignment: 'right', width: 80 },
          ],
        },
        { text: t('personalData'), margin: [0, 3, 0, 0] },
      ],
    }),
    content: body,
  };
}
