import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio, color } from '@polechamp/tokens';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/markdown.js';
import { buildSite, PLACEHOLDER_CONFIG } from '../src/site.js';

const content = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
let out: string;
const read = (path: string) => readFileSync(join(out, path), 'utf8');

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), 'site-'));
  buildSite(out, content, { ...PLACEHOLDER_CONFIG, appleAppId: 'ABCDE12345.app.polechamp' });
});
afterAll(() => rmSync(out, { recursive: true, force: true }));

describe('strona statyczna (IMP-179)', () => {
  it('TC-E2E-ORG-033: adresy z GET /v1/app-config (legal.*) mają strony; dokumenty wersjonowane', () => {
    // Ścieżki jak w AuthService.appConfig (apps/api).
    for (const path of ['regulamin', 'prywatnosc', 'umowa-powierzenia', 'usuniecie-konta', 'pomoc']) {
      expect(existsSync(join(out, path, 'index.html')), path).toBe(true);
    }
    for (const path of ['regulamin/v1', 'prywatnosc/v1', 'umowa-powierzenia/v1']) {
      expect(read(`${path}/index.html`)).toContain('Wersja 1 · obowiązuje od 1 listopada 2026');
    }
    expect(read('regulamin/index.html')).toBe(read('regulamin/v1/index.html'));
    expect(read('prywatnosc/index.html')).toContain('Projekt dokumentu');
    expect(read('usuniecie-konta/index.html')).toContain('wpisz „USUŃ”');
    expect(read('usuniecie-konta/index.html')).toContain('mailto:pomoc@polechamp.app');
  });

  it('TC-E2E-ORG-006: link resetu – linki uniwersalne /reset* i /pair*, strona zapasowa z przyciskiem do aplikacji', () => {
    const aasa = JSON.parse(read('.well-known/apple-app-site-association'));
    expect(aasa.applinks.details[0]).toEqual({
      appIDs: ['ABCDE12345.app.polechamp'],
      components: [{ '/': '/reset*' }, { '/': '/pair*' }],
    });
    const links = JSON.parse(read('.well-known/assetlinks.json'));
    expect(links[0].target).toMatchObject({ namespace: 'android_app', package_name: 'app.polechamp' });
    const reset = read('reset/index.html');
    expect(reset).toContain('Otwórz w aplikacji');
    expect(reset).toContain("'polechamp://reset?token='+encodeURIComponent(t)");
    expect(reset).toContain('App Store');
    expect(reset).toContain('Google Play');
  });

  it('kontrast tekstu i akcentu na tle Nocturne ≥ 4,5:1, fonty Inter lokalnie', () => {
    expect(contrastRatio(color.text, color.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color.accent, color.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color.neutral[400], color.bg)).toBeGreaterThanOrEqual(4.5);
    expect(existsSync(join(out, 'fonts', 'Inter-Regular.ttf'))).toBe(true);
    expect(read('style.css')).not.toMatch(/https?:\/\//);
  });

  it('Markdown: nagłówki, listy, escapowanie HTML, tylko bezpieczne linki', () => {
    const html = renderMarkdown(
      '## §1. Zasady\n\n- **a** <b>\n- [x](javascript:alert(1)) [ok](/pomoc)\n\nTekst',
    );
    expect(html).toContain('<h2>§1. Zasady</h2>');
    expect(html).toContain('<li><strong>a</strong> &lt;b&gt;</li>');
    expect(html).not.toContain('href="javascript');
    expect(html).toContain('<a href="/pomoc">ok</a>');
    expect(html).toContain('<p>Tekst</p>');
  });
});
