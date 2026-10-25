import { createI18n } from '@polechamp/i18n';
import type { ExportData } from '../export-data.service.js';

const i18n = createI18n();
const t = (key: string) => i18n.t(key, { ns: 'pdf' });
const tc = (key: string) => i18n.t(key, { ns: 'common' });

const BOM = String.fromCharCode(0xfeff);

/** Pole CSV z „;” – cudzysłów, gdy zawiera separator, cudzysłów lub nową linię. */
function field(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV wyników dla polskiego Excela (IMP-174, FR-708): UTF-8 z BOM, separator „;”, przecinek
 * dziesiętny (wartości `display` jak w PDF), wiersze CRLF; pseudonimy już w danych.
 */
export function resultsCsv(data: ExportData): Buffer {
  const header = ['category', 'rank', 'number', 'athlete', 'club', 'score', 'sheets', 'status'].map((k) =>
    t(`csv.${k}`),
  );
  const lines = [header.map(field).join(';')];
  for (const c of data.categories) {
    if (c.status === 'DRAFT') continue;
    for (const r of c.rows) {
      const withdrawn = r.entryStatus === 'WITHDRAWN';
      lines.push(
        [
          c.name,
          withdrawn ? null : r.rank,
          r.startNumber,
          r.fullName,
          r.club,
          withdrawn || r.official === null ? null : r.display,
          r.sheetCount,
          withdrawn ? tc('entryStatus.WITHDRAWN') : r.isProvisional ? tc('provisional') : '',
        ]
          .map(field)
          .join(';'),
      );
    }
  }
  return Buffer.from(BOM + lines.join('\r\n') + '\r\n', 'utf8');
}
