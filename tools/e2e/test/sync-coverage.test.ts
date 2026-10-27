import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const manual = readFileSync(resolve(root, 'docs-dev/qa/sync/manual.md'), 'utf8');
const flows = readdirSync(resolve(root, 'apps/mobile/e2e/maestro/sync'));

describe('pokrycie TC-SYNC-001…040 (IMP-458, IMP-469)', () => {
  const ids = Array.from({ length: 40 }, (_, i) => `TC-SYNC-${String(i + 1).padStart(3, '0')}`);

  it.each(ids)('%s ma wiersz w mapie pokrycia', (id) => {
    expect(manual).toMatch(new RegExp(`\\| ${id} \\|`));
  });

  it('pliki testów wskazane w mapie zawierają ID przypadku', () => {
    const files = new Map<string, string>();
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const p = resolve(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.test\.tsx?$/.test(e.name))
          files.set(e.name, (files.get(e.name) ?? '') + readFileSync(p, 'utf8'));
      }
    };
    walk(resolve(root, 'apps/mobile/src'));
    walk(resolve(root, 'apps/api/test'));
    const wrong: string[] = [];
    for (const line of manual.split('\n')) {
      const id = /^\| (TC-SYNC-\d{3}) \|/.exec(line)?.[1];
      if (!id) continue;
      const automat = line.split('|')[2] ?? '';
      for (const m of automat.matchAll(/(?:Jest|API) `([\w.-]+\.test\.tsx?)`/g)) {
        if (!files.get(m[1]!)?.includes(id)) wrong.push(`${id} → ${m[1]}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('każdy przepływ sync/ wskazany w mapie istnieje', () => {
    const referenced = [...manual.matchAll(/`sync\/([\w-]+\.yaml)`/g)].map((m) => m[1]!);
    expect(referenced.filter((f) => !flows.includes(f))).toEqual([]);
    expect(flows.filter((f) => !referenced.includes(f))).toEqual([]);
  });
});
