import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseAllDocuments } from 'yaml';

/**
 * Statyczna kontrola przepływów Maestro (IMP-454): poprawny YAML, nagłówek z `appId`, każdy `id:` istnieje
 * jako `testID` w kodzie aplikacji, istniejące pliki `runFlow`/`runScript`, brak PIN-ów demo (05-bez §3.1).
 * Działa bez urządzeń – uruchamiana w zwykłych testach CI.
 */
export const APP_ID = 'app.polechamp';
const DEMO_PINS = ['1234', '2345', '3456', '4567', '5678'];

function walk(dir: string, ext: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, ext, out);
    else if (ext.test(name)) out.push(path);
  }
  return out;
}

export interface TestIds {
  exact: Set<string>;
  /** Wzorce z literałów szablonowych, np. `profile-${judge.id}` → /^profile-.+$/. */
  patterns: RegExp[];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `testID` z plików `.tsx` (literały i szablony). */
export function collectTestIds(roots: string[]): TestIds {
  const exact = new Set<string>();
  const patterns: RegExp[] = [];
  for (const root of roots) {
    for (const file of walk(root, /\.tsx?$/)) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/testID[=:]\s*\{?\s*['"]([\w-]+)['"]/g)) exact.add(m[1]!);
      for (const m of src.matchAll(/['"]([a-z][\w-]*)['"]/g)) if (m[1]!.includes('-')) exact.add(m[1]!);
      for (const m of src.matchAll(/`((?:\$\{[^}]+\}|[a-z][\w]*)(?:-(?:\$\{[^}]+\}|[\w]+))+)`/g)) {
        const parts = m[1]!.split(/\$\{[^}]+\}/);
        // `${a}-${b}` pasowałby do wszystkiego – wzorzec musi mieć stały fragment poza myślnikami.
        if (parts.join('').replace(/-/g, '').length === 0) continue;
        patterns.push(new RegExp(`^${parts.map(escape).join('.+')}$`));
      }
    }
  }
  return { exact, patterns };
}

export interface FlowIssue {
  file: string;
  message: string;
}

function idsInCommands(node: unknown, out: string[]): void {
  if (Array.isArray(node)) node.forEach((n) => idsInCommands(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'id' && typeof v === 'string') out.push(v);
      else idsInCommands(v, out);
    }
  }
}

function filesInCommands(node: unknown, out: string[]): void {
  if (Array.isArray(node)) node.forEach((n) => filesInCommands(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if ((k === 'runFlow' || k === 'runScript') && typeof v === 'string') out.push(v);
      else if ((k === 'runFlow' || k === 'runScript') && v && typeof v === 'object' && 'file' in v)
        out.push(String((v as { file: unknown }).file));
      filesInCommands(v, out);
    }
  }
}

/** Czy `id` z przepływu (może zawierać `${...}`) odpowiada jakiemuś `testID` w aplikacji. */
export function idKnown(id: string, ids: TestIds): boolean {
  if (!id.includes('${')) return ids.exact.has(id) || ids.patterns.some((p) => p.test(id));
  const sample = id.replace(/\$\{[^}]+\}/g, 'x1');
  const flowRe = new RegExp(
    `^${id
      .split(/\$\{[^}]+\}/)
      .map(escape)
      .join('.+')}$`,
  );
  return ids.patterns.some((p) => p.test(sample)) || [...ids.exact].some((e) => flowRe.test(e));
}

export function checkFlows(flowsDir: string, ids: TestIds): FlowIssue[] {
  const issues: FlowIssue[] = [];
  for (const file of walk(flowsDir, /\.ya?ml$/)) {
    const rel = relative(flowsDir, file).replace(/\\/g, '/');
    if (rel === 'config.yaml') continue;
    const text = readFileSync(file, 'utf8');
    const docs = parseAllDocuments(text);
    const errors = docs.flatMap((d) => d.errors.map((e) => e.message));
    if (errors.length > 0) {
      issues.push({ file: rel, message: `YAML: ${errors[0]}` });
      continue;
    }
    const [header, body] = docs.map((d) => d.toJS() as unknown);
    if ((header as { appId?: string } | null)?.appId !== APP_ID)
      issues.push({ file: rel, message: 'brak appId' });
    if (!Array.isArray(body)) {
      issues.push({ file: rel, message: 'brak listy kroków po „---”' });
      continue;
    }
    const used: string[] = [];
    idsInCommands(body, used);
    for (const id of used)
      if (!idKnown(id, ids)) issues.push({ file: rel, message: `nieznany testID „${id}”` });
    const refs: string[] = [];
    filesInCommands(body, refs);
    for (const ref of refs) {
      try {
        statSync(join(file, '..', ref));
      } catch {
        issues.push({ file: rel, message: `brak pliku ${ref}` });
      }
    }
    for (const pin of DEMO_PINS) {
      if (text.includes(`'${pin}'`) || text.includes(`"${pin}"`))
        issues.push({ file: rel, message: `PIN demo ${pin}` });
    }
  }
  return issues;
}
