import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { color } from '@polechamp/tokens';
import { renderMarkdown } from './markdown.js';

/** Dokument prawny w wersji (TL-39): `/{slug}/v{n}`, a `/{slug}` pokazuje bieżącą wersję. */
export interface LegalDocument {
  slug: string;
  title: string;
  version: number;
  /** Data obowiązywania `YYYY-MM-DD`. */
  effective: string;
  file: string;
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  { slug: 'regulamin', title: 'Regulamin', version: 1, effective: '2026-11-01', file: 'regulamin-v1.md' },
  {
    slug: 'prywatnosc',
    title: 'Polityka prywatności',
    version: 1,
    effective: '2026-11-01',
    file: 'prywatnosc-v1.md',
  },
  {
    slug: 'umowa-powierzenia',
    title: 'Umowa powierzenia danych',
    version: 1,
    effective: '2026-11-01',
    file: 'umowa-powierzenia-v1.md',
  },
];

export interface SiteConfig {
  /** Identyfikator aplikacji iOS `TEAMID.bundleId` (Apple Developer – decyzja właściciela). */
  appleAppId: string;
  androidPackage: string;
  /** Odciski SHA-256 certyfikatu podpisu z EAS / Google Play App Signing. */
  androidCertFingerprints: string[];
  appStoreUrl: string;
  playStoreUrl: string;
  supportEmail: string;
}

/** Wartości zastępcze do czasu utworzenia kont Apple / Google / EAS (IMP-179 – wymaga decyzji). */
export const PLACEHOLDER_CONFIG: SiteConfig = {
  appleAppId: 'TEAMID.app.polechamp',
  androidPackage: 'app.polechamp',
  androidCertFingerprints: [
    '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
  ],
  appStoreUrl: 'https://apps.apple.com/',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=app.polechamp',
  supportEmail: 'pomoc@polechamp.app',
};

const MONTHS = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];
const plDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
};

/** Jasny wariant Nocturne (czytelność długich tekstów) z akcentem accent-700; kontrast ≥ 4,5:1. */
const CSS = `
@font-face { font-family: Inter; font-weight: 400; src: url(/fonts/Inter-Regular.ttf) format('truetype'); font-display: swap; }
@font-face { font-family: Inter; font-weight: 500; src: url(/fonts/Inter-Medium.ttf) format('truetype'); font-display: swap; }
:root { --bg: ${color.bg}; --surface: ${color.surface}; --text: ${color.text}; --accent: ${color.accent};
  --muted: ${color.neutral[400]}; --divider: ${color.divider}; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 400 16px/1.6 Inter, system-ui, sans-serif; }
header, main, footer { max-width: 760px; margin: 0 auto; padding: 0 16px; }
header { padding-top: 32px; }
.brand { color: var(--accent); font-weight: 500; letter-spacing: .12em; font-size: 13px; text-decoration: none; }
h1 { font-weight: 500; font-size: 28px; line-height: 1.25; margin: 12px 0 4px; }
h2 { font-weight: 500; font-size: 20px; margin: 32px 0 8px; }
h3 { font-weight: 500; font-size: 17px; margin: 24px 0 6px; }
a { color: var(--accent); }
.meta { color: var(--muted); font-size: 14px; margin: 0 0 24px; }
.card { background: var(--surface); border-radius: 16px; padding: 20px; margin: 24px 0; }
.draft { border: 1px solid var(--accent); }
.button { display: inline-block; background: var(--accent); color: ${color.bg}; font-weight: 500; padding: 14px 24px;
  border-radius: 999px; text-decoration: none; margin: 8px 8px 8px 0; }
.ghost { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
footer { color: var(--muted); font-size: 13px; padding: 32px 16px 48px; border-top: 1px solid var(--divider); margin-top: 48px; }
footer a { margin-right: 16px; }
`;

function page(title: string, body: string, options: { description?: string; script?: string } = {}): string {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · PoleChamp</title>
${options.description ? `<meta name="description" content="${options.description}">` : ''}
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header><a class="brand" href="/">POLECHAMP</a></header>
<main>
${body}
</main>
<footer>
<a href="/regulamin">Regulamin</a><a href="/prywatnosc">Polityka prywatności</a><a href="/umowa-powierzenia">Umowa powierzenia danych</a><a href="/usuniecie-konta">Usunięcie konta</a><a href="/pomoc">Pomoc</a>
</footer>
${options.script ? `<script>${options.script}</script>` : ''}
</body>
</html>
`;
}

function legalPage(doc: LegalDocument, markdown: string): string {
  const draft = markdown.includes('PROJEKT – TREŚĆ DO ZATWIERDZENIA');
  return page(
    doc.title,
    `<h1>${doc.title}</h1>
<p class="meta">Wersja ${doc.version} · obowiązuje od ${plDate(doc.effective)}</p>
${draft ? '<div class="card draft"><strong>Projekt dokumentu.</strong> Ostateczną treść przygotowuje prawnik (Q-10).</div>' : ''}
${renderMarkdown(markdown.replace(/^.*PROJEKT – TREŚĆ DO ZATWIERDZENIA.*$/m, ''))}`,
  );
}

function deletionPage(config: SiteConfig): string {
  return page(
    'Usunięcie konta',
    `<h1>Usunięcie konta</h1>
<p class="meta">Dotyczy konta organizatora w aplikacji PoleChamp.</p>
<h2>W aplikacji</h2>
<ol>
<li>Otwórz PoleChamp i przejdź do <strong>Konto</strong>.</li>
<li>Wybierz <strong>Usuń konto</strong> i wpisz „USUŃ”, aby potwierdzić.</li>
<li>Konto zostaje wyłączone od razu, a dane usunięte trwale po 30 dniach.</li>
</ol>
<p>Jeśli masz turniej w trakcie, najpierw go zakończ.</p>
<h2>Bez dostępu do aplikacji</h2>
<div class="card">
<p>Napisz z adresu e-mail przypisanego do konta na <a href="mailto:${config.supportEmail}?subject=Usuni%C4%99cie%20konta">${config.supportEmail}</a> z tematem „Usunięcie konta”. Odpowiemy w ciągu 7 dni.</p>
</div>
<h2>Co usuwamy, a co zostaje</h2>
<ul>
<li>Usuwamy: konto (e-mail, nazwę, hasło), turnieje wraz z listami zawodniczek, sędziów i ocenami.</li>
<li>Dziennik operacji przechowujemy bez danych osobowych przez okres wymagany przepisami (szczegóły w <a href="/prywatnosc">polityce prywatności</a>).</li>
</ul>`,
    { description: 'Jak usunąć konto PoleChamp i jakie dane są usuwane.' },
  );
}

/** Strona zapasowa linku resetu hasła (FR-104): otwiera aplikację, a bez niej – linki do sklepów. */
function resetPage(config: SiteConfig): string {
  return page(
    'Ustaw nowe hasło',
    `<h1>Ustaw nowe hasło</h1>
<p>Otwórz link w aplikacji PoleChamp na tym urządzeniu, aby ustawić nowe hasło.</p>
<p><a class="button" id="open" href="polechamp://reset">Otwórz w aplikacji</a></p>
<div class="card">
<p>Nie masz aplikacji? Zainstaluj ją i otwórz link z e-maila ponownie.</p>
<a class="button ghost" href="${config.appStoreUrl}">App Store</a><a class="button ghost" href="${config.playStoreUrl}">Google Play</a>
</div>
<p class="meta">Link jest ważny 60 minut i działa jednorazowo.</p>`,
    {
      // Token przekazujemy tylko do schematu aplikacji (bez zapisu i bez zapytań do serwera).
      script: `(function(){var t=new URLSearchParams(location.search).get('token');if(t){document.getElementById('open').href='polechamp://reset?token='+encodeURIComponent(t);}})();`,
    },
  );
}

function pairPage(config: SiteConfig): string {
  return page(
    'Parowanie tabletu',
    `<h1>Parowanie tabletu sędziowskiego</h1>
<p>Otwórz ten link na tablecie z zainstalowaną aplikacją PoleChamp albo wpisz kod parowania ręcznie.</p>
<p><a class="button" id="open" href="polechamp://pair">Otwórz w aplikacji</a></p>
<p><a class="button ghost" href="${config.appStoreUrl}">App Store</a><a class="button ghost" href="${config.playStoreUrl}">Google Play</a></p>`,
    {
      script: `(function(){var c=new URLSearchParams(location.search).get('code');if(c){document.getElementById('open').href='polechamp://pair?code='+encodeURIComponent(c);}})();`,
    },
  );
}

/** `apple-app-site-association` – linki uniwersalne dla `/reset*` i `/pair*` (TL-39). */
export function appleAssociation(config: SiteConfig) {
  return {
    applinks: {
      details: [{ appIDs: [config.appleAppId], components: [{ '/': '/reset*' }, { '/': '/pair*' }] }],
    },
  };
}

/** `assetlinks.json` – Android App Links. */
export function assetLinks(config: SiteConfig) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.androidPackage,
        sha256_cert_fingerprints: config.androidCertFingerprints,
      },
    },
  ];
}

/** Ścieżka → plik wyjściowy (`/regulamin` → `regulamin/index.html`). */
export function buildSite(
  outDir: string,
  contentDir: string,
  config: SiteConfig = PLACEHOLDER_CONFIG,
): string[] {
  const written: string[] = [];
  const write = (path: string, content: string) => {
    const file = join(outDir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    written.push(path);
  };
  write('style.css', CSS);
  const require = createRequire(import.meta.url);
  const fonts = dirname(require.resolve('@expo-google-fonts/inter/package.json'));
  mkdirSync(join(outDir, 'fonts'), { recursive: true });
  copyFileSync(join(fonts, '400Regular', 'Inter_400Regular.ttf'), join(outDir, 'fonts', 'Inter-Regular.ttf'));
  copyFileSync(join(fonts, '500Medium', 'Inter_500Medium.ttf'), join(outDir, 'fonts', 'Inter-Medium.ttf'));

  for (const doc of LEGAL_DOCUMENTS) {
    const html = legalPage(doc, readFileSync(join(contentDir, doc.file), 'utf8'));
    write(`${doc.slug}/v${doc.version}/index.html`, html);
    const latest = Math.max(...LEGAL_DOCUMENTS.filter((d) => d.slug === doc.slug).map((d) => d.version));
    if (doc.version === latest) write(`${doc.slug}/index.html`, html);
  }
  write('usuniecie-konta/index.html', deletionPage(config));
  write(
    'pomoc/index.html',
    page('Pomoc', renderMarkdown(readFileSync(join(contentDir, 'pomoc.md'), 'utf8'))),
  );
  write('reset/index.html', resetPage(config));
  write('pair/index.html', pairPage(config));
  write(
    'index.html',
    page(
      'Wyniki zawodów pole dance',
      '<h1>PoleChamp</h1><p>Aplikacja do prowadzenia zawodów pole dance: organizator na telefonie, sędziowie na tabletach – także bez internetu.</p>',
    ),
  );
  // Bez rozszerzenia – CloudFront ustawia `Content-Type: application/json` (IMP-012).
  write('.well-known/apple-app-site-association', JSON.stringify(appleAssociation(config), null, 2));
  write('.well-known/assetlinks.json', JSON.stringify(assetLinks(config), null, 2));
  return written;
}
