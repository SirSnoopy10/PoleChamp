import { ESLint } from 'eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const eslint = new ESLint({ cwd: root });

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  return (result?.messages ?? []).map((m) => m.ruleId ?? m.message);
}

const screen = 'apps/mobile/src/features/judge/score-form/ScoreForm.tsx';

describe('eslint.config.mjs – reguły per obszar', () => {
  it('TC-I18N-005: literał tekstu w JSX ekranu jest błędem', async () => {
    const ids = await ruleIds('export const A = () => <Text>Zapisz</Text>;\n', screen);
    expect(ids).toContain('no-restricted-syntax');
  });

  it('TC-I18N-005: literał w atrybucie placeholder jest błędem', async () => {
    const ids = await ruleIds(
      'export const A = () => <TextField placeholder="np. Pole Sport Beginner" />;\n',
      screen,
    );
    expect(ids).toContain('no-restricted-syntax');
  });

  it('TC-I18N-005: tekst z klucza i18n przechodzi', async () => {
    const ids = await ruleIds(
      "export const A = () => <Text>{t('judge.form.submitButton')}</Text>;\n",
      screen,
    );
    expect(ids).toEqual([]);
  });

  it('TC-I18N-005: wyjątek dla plików DevCatalog *.dev.tsx', async () => {
    const ids = await ruleIds(
      'export const A = () => <Text>Zapisz</Text>;\n',
      'apps/mobile/src/features/x/Catalog.dev.tsx',
    );
    expect(ids).not.toContain('no-restricted-syntax');
  });

  it('TC-I18N-005: zakaz obejmuje komponenty src/ui i trasy app/, nie DevCatalog src/dev', async () => {
    const code = 'export const A = () => <Text>Zapisz</Text>;\n';
    expect(await ruleIds(code, 'apps/mobile/src/ui/Button.tsx')).toContain('no-restricted-syntax');
    expect(await ruleIds(code, 'apps/mobile/app/(org)/index.tsx')).toContain('no-restricted-syntax');
    expect(await ruleIds(code, 'apps/mobile/src/dev/catalog/sections/x.catalog.tsx')).not.toContain(
      'no-restricted-syntax',
    );
  });

  it("TC-TOKENS-003: '#fff' w ekranie jest błędem", async () => {
    const ids = await ruleIds("export const s = { color: '#fff' };\n", screen);
    expect(ids).toContain('polechamp/no-raw-style-values');
  });

  it('@polechamp/scoring: import platformowy jest błędem', async () => {
    const ids = await ruleIds(
      "import fs from 'node:fs';\nexport const x = fs;\n",
      'packages/scoring/src/x.ts',
    );
    expect(ids).toContain('no-restricted-imports');
  });
});
