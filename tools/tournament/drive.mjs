#!/usr/bin/env node
// Sterownik emulatorów Androida przez adb do próby turnieju (telefon organizatora + tablety sędziów).
// Bez zależności i bez instalowania sterownika na urządzeniu (Maestro zostawia ~80 MB APK na przebieg).
//
//   node tools/tournament/drive.mjs <serial> <polecenie> [argumenty]
//
// Polecenia:
//   ui                         – widoczne elementy: testID / tekst / opis + środek (x,y)
//   tap <sel> [<sel>…]         – tapnięcie pierwszego pasującego selektora (czeka do 10 s)
//   type <tekst>               – wpisanie tekstu (ASCII; spacje dozwolone)
//   fill <sel> <tekst>         – tap w pole, wyczyszczenie i wpisanie
//   wait <sel> [ms]            – czekanie na element
//   gone <sel> [ms]            – czekanie, aż element zniknie
//   has <sel>                  – kod wyjścia 0/1
//   key <BACK|ENTER|…>         – klawisz
//   swipe up|down [n]          – przewinięcie ekranu
//   scrollto <sel> [max]       – przewijanie w dół do elementu
//   shot <plik.png>            – zrzut ekranu (katalog z RC_SHOTS, domyślnie .rc/shots)
//   net on|off                 – wi-fi i dane komórkowe (tryb offline tabletu)
// Selektor: id=<testID>, text=<tekst>, has=<fragment tekstu>, desc=<opis>, idp=<prefiks testID>, xy=<x>,<y>
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ADB = process.env.ADB ?? 'D:/android-dev/sdk/platform-tools/adb.exe';
const SHOTS = process.env.RC_SHOTS ?? resolve('.rc/shots');
const [serial, cmd, ...args] = process.argv.slice(2);

const adb = (...a) => execFileSync(ADB, ['-s', serial, ...a], { encoding: 'latin1', maxBuffer: 64 << 20 });
const adbBin = (...a) => execFileSync(ADB, ['-s', serial, ...a], { maxBuffer: 64 << 20 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const decode = (s) =>
  Buffer.from(s, 'latin1')
    .toString('utf8')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#10;/g, ' ')
    .replace(/&amp;/g, '&');

function dump() {
  for (let i = 0; i < 10; i++) {
    // Zrzut zawodzi w trakcie animacji ekranu – krótka przerwa i ponowienie.
    if (i > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
    let xml = '';
    try {
      xml = execFileSync(ADB, ['-s', serial, 'exec-out', 'uiautomator', 'dump', '--compressed', '/dev/tty'], {
        encoding: 'latin1',
        timeout: 8000,
        maxBuffer: 64 << 20,
      });
    } catch {
      xml = '';
    }
    if (xml.includes('<hierarchy')) return parse(xml);
  }
  throw new Error('uiautomator dump nie powiódł się');
}

function parse(xml) {
  const nodes = [];
  for (const m of xml.matchAll(/<node ([^>]*?)\/?>/g)) {
    const attr = (k) => decode(m[1].match(new RegExp(`${k}="([^"]*)"`))?.[1] ?? '');
    const b = attr('bounds').match(/\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/);
    if (!b) continue;
    const [x1, y1, x2, y2] = b.slice(1).map(Number);
    if (x2 <= x1 || y2 <= y1) continue;
    nodes.push({
      id: attr('resource-id'),
      text: attr('text'),
      desc: attr('content-desc'),
      cls: attr('class').replace(/^.*\./, ''),
      enabled: attr('enabled') !== 'false',
      checked: attr('checked') === 'true',
      x: Math.round((x1 + x2) / 2),
      y: Math.round((y1 + y2) / 2),
      w: x2 - x1,
      h: y2 - y1,
    });
  }
  return nodes;
}

function match(node, sel) {
  const i = sel.indexOf('=');
  const [k, v] = [sel.slice(0, i), sel.slice(i + 1)];
  switch (k) {
    case 'id':
      return node.id === v;
    case 'idp':
      return node.id.startsWith(v);
    case 'text':
      return node.text === v || node.desc === v;
    case 'has':
      return node.text.includes(v) || node.desc.includes(v);
    case 'desc':
      return node.desc === v;
    default:
      throw new Error(`Nieznany selektor: ${sel}`);
  }
}

async function find(sels, timeout = 10_000) {
  const end = Date.now() + timeout;
  for (;;) {
    for (const sel of sels) {
      if (sel.startsWith('xy=')) {
        const [x, y] = sel.slice(3).split(',').map(Number);
        return { x, y, id: '', text: sel };
      }
    }
    const nodes = dump();
    for (const sel of sels) {
      const hit = nodes.find((n) => match(n, sel));
      if (hit) return hit;
    }
    if (Date.now() > end) return null;
    await sleep(400);
  }
}

/** Chowa klawiaturę ekranową (zasłania przyciski u dołu arkuszy); BACK tylko, gdy jest widoczna. */
const keyboardShown = () =>
  /mInputShown=true|isInputViewShown=true/.test(adb('shell', 'dumpsys', 'input_method'));
const hideKeyboard = () => {
  if (keyboardShown()) {
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
};
const tapAt = (x, y) => adb('shell', 'input', 'tap', String(x), String(y));
const typeText = (text) => {
  // `input text`: spacja jako %s, znaki powłoki w cudzysłowie.
  const escaped = text.replace(/ /g, '%s').replace(/(["'`\\$&|;<>()*?!#~])/g, '\\$1');
  adb('shell', 'input', 'text', escaped);
};

async function main() {
  switch (cmd) {
    case 'ui': {
      const rows = dump()
        .filter((n) => n.id || n.text || n.desc)
        .map(
          (n) =>
            `${n.id ? `#${n.id} ` : ''}${n.text ? `"${n.text}" ` : ''}${n.desc && n.desc !== n.text ? `[${n.desc}] ` : ''}` +
            `${n.enabled ? '' : '(disabled) '}${n.checked ? '(checked) ' : ''}@${n.x},${n.y}`,
        );
      console.log(rows.join('\n'));
      return;
    }
    case 'tap': {
      hideKeyboard();
      const hit = await find(args);
      if (!hit) throw new Error(`Nie znaleziono: ${args.join(' | ')}`);
      tapAt(hit.x, hit.y);
      console.log(`tap ${hit.id || hit.text} @${hit.x},${hit.y}`);
      return;
    }
    case 'type':
      typeText(args.join(' '));
      return;
    case 'fill': {
      const [sel, ...rest] = args;
      const hit = await find([sel]);
      if (!hit) throw new Error(`Nie znaleziono: ${sel}`);
      tapAt(hit.x, hit.y);
      await sleep(250);
      adb('shell', 'input', 'keycombination', 'KEYCODE_CTRL_LEFT', 'KEYCODE_A');
      adb('shell', 'input', 'keyevent', 'KEYCODE_DEL');
      typeText(rest.join(' '));
      return;
    }
    case 'wait':
    case 'has': {
      const hit = await find([args[0]], cmd === 'has' ? 0 : Number(args[1] ?? 15_000));
      if (!hit) {
        console.error(`brak: ${args[0]}`);
        process.exit(1);
      }
      console.log(`ok ${hit.id || hit.text} @${hit.x},${hit.y}`);
      return;
    }
    case 'gone': {
      const end = Date.now() + Number(args[1] ?? 15_000);
      while (Date.now() < end) {
        if (!dump().some((n) => match(n, args[0]))) return console.log('gone');
        await sleep(400);
      }
      console.error(`nadal widoczne: ${args[0]}`);
      process.exit(1);
      return;
    }
    case 'hidekb':
      hideKeyboard();
      return;
    case 'key':
      adb('shell', 'input', 'keyevent', `KEYCODE_${args[0]}`);
      return;
    case 'swipe': {
      const size = adb('shell', 'wm', 'size').match(/(\d+)x(\d+)\s*$/m);
      let [w, h] = [Number(size[1]), Number(size[2])];
      const rot = adb('shell', 'dumpsys', 'input').match(/SurfaceOrientation: (\d)/)?.[1];
      if (rot === '1' || rot === '3') [w, h] = [h, w];
      const n = Number(args[1] ?? 1);
      const [from, to] = args[0] === 'down' ? [0.75, 0.3] : [0.3, 0.75];
      for (let i = 0; i < n; i++) {
        adb('shell', 'input', 'swipe', String(w / 2), String(h * from), String(w / 2), String(h * to), '400');
        await sleep(300);
      }
      return;
    }
    case 'scrollto': {
      const max = Number(args[1] ?? 8);
      for (let i = 0; i <= max; i++) {
        const hit = dump().find((n) => match(n, args[0]));
        if (hit) return console.log(`ok @${hit.x},${hit.y}`);
        const size = adb('shell', 'wm', 'size').match(/(\d+)x(\d+)\s*$/m);
        let [w, h] = [Number(size[1]), Number(size[2])];
        const rot = adb('shell', 'dumpsys', 'input').match(/SurfaceOrientation: (\d)/)?.[1];
        if (rot === '1' || rot === '3') [w, h] = [h, w];
        adb(
          'shell',
          'input',
          'swipe',
          String(w / 2),
          String(h * 0.7),
          String(w / 2),
          String(h * 0.35),
          '400',
        );
        await sleep(350);
      }
      console.error(`nie znaleziono po przewinięciu: ${args[0]}`);
      process.exit(1);
      return;
    }
    case 'shot': {
      const file = resolve(SHOTS, args[0]);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, adbBin('exec-out', 'screencap', '-p'));
      console.log(file);
      return;
    }
    case 'net': {
      const on = args[0] === 'on';
      adb('shell', 'svc', 'wifi', on ? 'enable' : 'disable');
      adb('shell', 'svc', 'data', on ? 'enable' : 'disable');
      console.log(`net ${on ? 'on' : 'off'}`);
      return;
    }
    default:
      console.error('Polecenia: ui, tap, type, fill, wait, gone, has, key, swipe, scrollto, shot, net');
      process.exit(2);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
