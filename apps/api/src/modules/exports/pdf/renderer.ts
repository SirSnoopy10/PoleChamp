import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import pdfmake from 'pdfmake';
import type { ExportData } from '../export-data.service.js';
import { resultsDoc } from './templates/results.js';

const require = createRequire(import.meta.url);
/** Inter Regular/Medium – statyczne TTF (Google Fonts, pakiet `@expo-google-fonts/inter`). */
const FONT_DIR = dirname(require.resolve('@expo-google-fonts/inter/package.json'));
const REGULAR = join(FONT_DIR, '400Regular', 'Inter_400Regular.ttf');
const MEDIUM = join(FONT_DIR, '500Medium', 'Inter_500Medium.ttf');

pdfmake.setFonts({
  Inter: {
    normal: REGULAR,
    bold: MEDIUM,
    italics: REGULAR,
    bolditalics: MEDIUM,
  },
});
// Bez zasobów zewnętrznych: tylko lokalne fonty.
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((path) => path.startsWith(FONT_DIR));

/** Renderer PDF wyników (IMP-172, ADR-009) – pdfmake 0.3 z Inter. */
export class PdfRenderer {
  render(data: ExportData, scope: 'TOURNAMENT' | 'CATEGORY', generatedAt = new Date()): Promise<Buffer> {
    return pdfmake.createPdf(resultsDoc(data, scope, generatedAt)).getBuffer();
  }
}
