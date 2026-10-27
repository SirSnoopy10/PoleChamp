// Próg Reassure w CI (IMP-500, TC-PERF-004): porównanie `.reassure/output.json` z bazą `main`.
// Błąd, gdy scenariusz renderuje się więcej razy niż w bazie albo jest wolniejszy o > 10 %
// (tylko zmiany istotne statystycznie – lista `significant`).
import { readFileSync } from 'node:fs';

const MAX_SLOWDOWN = 0.1;
const file = process.argv[2] ?? '.reassure/output.json';
const out = JSON.parse(readFileSync(file, 'utf8'));

const failures = [];
for (const e of out.countChanged ?? []) {
  if ((e.current?.meanCount ?? 0) > (e.baseline?.meanCount ?? Infinity)) {
    failures.push(`${e.name}: renderów ${e.baseline.meanCount} → ${e.current.meanCount}`);
  }
}
for (const e of out.significant ?? []) {
  if ((e.relativeDurationDiff ?? 0) > MAX_SLOWDOWN) {
    const pct = (e.relativeDurationDiff * 100).toFixed(1);
    failures.push(
      `${e.name}: czas +${pct}% (${e.baseline.meanDuration.toFixed(1)} → ${e.current.meanDuration.toFixed(1)} ms)`,
    );
  }
}
for (const e of out.errors ?? []) failures.push(String(e));

if (failures.length) {
  console.error(`Reassure – regresja wydajności:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `Reassure – bez regresji (${(out.significant ?? []).length + (out.meaningless ?? []).length} scenariuszy).`,
);
