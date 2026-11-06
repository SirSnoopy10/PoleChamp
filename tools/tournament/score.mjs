#!/usr/bin/env node
// Ocena jednego występu na tablecie sędziego przez UI (+/− kryteriów, kary, „Zatwierdź”).
//   node tools/tournament/score.mjs <serial> <entryId> <kroki kryteriów, np. 3,2,-1,4,0> [kara=liczba …] [--shot plik.png]
// Krok = jedno tapnięcie „+” (ujemne – „−”), od wartości domyślnej. Kara: kolejność kar w formularzu (1, 2…).
import { execFileSync } from 'node:child_process';

const ADB = process.env.ADB ?? 'D:/android-dev/sdk/platform-tools/adb.exe';
const DRIVE = new URL('./drive.mjs', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const [serial, entryId, steps, ...rest] = process.argv.slice(2);
const shotIdx = rest.indexOf('--shot');
const shot = shotIdx >= 0 ? rest.splice(shotIdx, 2)[1] : null;
const penalties = Object.fromEntries(rest.map((p) => p.split('=').map(Number)));

const drive = (...a) => execFileSync('node', [DRIVE, serial, ...a], { encoding: 'utf8' });
const tap = (x, y) => execFileSync(ADB, ['-s', serial, 'shell', 'input', 'tap', String(x), String(y)]);
const ui = () =>
  drive('ui')
    .split('\n')
    .map((l) => {
      const m = l.match(/^#(\S+) .*@(\d+),(\d+)$/);
      return m ? { id: m[1], line: l, x: Number(m[2]), y: Number(m[3]) } : null;
    })
    .filter(Boolean);
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

drive('tap', `id=queue-row-${entryId}`);
sleep(1200);
let nodes = ui();
const plus = nodes.filter((n) => /^criterion-.+-plus$/.test(n.id));
const minus = nodes.filter((n) => /^criterion-.+-minus$/.test(n.id));
const counts = steps.split(',').map(Number);
counts.forEach((c, i) => {
  const target = c >= 0 ? plus[i] : minus[i];
  if (!target) throw new Error(`Brak kryterium ${i + 1} na ekranie`);
  for (let k = 0; k < Math.abs(c); k++) tap(target.x, target.y);
});
for (const [idx, n] of Object.entries(penalties)) {
  const pens = nodes.filter((p) => /^penalty-[0-9a-f-]+$/.test(p.id));
  const pen = pens[Number(idx) - 1];
  if (!pen) throw new Error(`Brak kary ${idx}`);
  // Licznik kary: „+” po prawej stronie wiersza.
  const plusBtn = nodes.find((p) => p.id === `${pen.id}-plus`) ?? { x: pen.x + 260, y: pen.y };
  for (let k = 0; k < n; k++) tap(plusBtn.x, plusBtn.y);
}
sleep(400);
nodes = ui();
const total = nodes.find((n) => n.id === 'score-total')?.line.match(/"([^"]+)"/)?.[1];
if (shot) drive('shot', shot);
drive('tap', 'id=score-submit');
sleep(900);
nodes = ui();
if (nodes.some((n) => n.id === 'untouched-confirm')) {
  drive('tap', 'id=untouched-confirm');
  sleep(800);
}
console.log(`${serial} ${entryId.slice(-6)} suma=${total}`);
