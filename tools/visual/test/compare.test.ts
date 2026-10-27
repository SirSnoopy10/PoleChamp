import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { compareDir, htmlReport, prComment } from '../src/compare.ts';

/** Minimalny PNG RGB (bez zależności): `pixel(x, y)` → [r, g, b]. */
function png(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number],
): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) raw.set(pixel(x, y), y * (width * 3 + 1) + 1 + x * 3);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('regresja wizualna – porównanie (IMP-459)', () => {
  it('TC-DESIGN-023: wykrywa zmiany, nowe, brakujące i złe nazwy; ignoruje pasek statusu', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'visual-'));
    const [base, act, out] = ['base', 'act', 'out'].map((d) => join(dir, d));
    mkdirSync(base!);
    mkdirSync(act!);
    const gray = png(200, 200, () => [40, 40, 50]);
    // Zmiana tylko w pasku statusu (y < 48 dla tabletu) – ignorowana.
    const statusOnly = png(200, 200, (_x, y) => (y < 20 ? [255, 255, 255] : [40, 40, 50]));
    const changed = png(200, 200, (x, y) => (x > 100 && y > 100 ? [230, 80, 80] : [40, 40, 50]));
    writeFileSync(join(base!, 'buttons__primary__tablet.png'), gray);
    writeFileSync(join(act!, 'buttons__primary__tablet.png'), statusOnly);
    writeFileSync(join(base!, 'scr-org-01__seed__phone.png'), gray);
    writeFileSync(join(act!, 'scr-org-01__seed__phone.png'), changed);
    writeFileSync(join(act!, 'cards__new__phone.png'), gray);
    writeFileSync(join(base!, 'gone__x__phone.png'), gray);
    writeFileSync(join(act!, 'Zla_Nazwa.png'), gray);

    const entries = await compareDir(act!, base!, out!);
    expect(Object.fromEntries(entries.map((e) => [e.name, e.status]))).toEqual({
      'buttons__primary__tablet.png': 'same',
      'scr-org-01__seed__phone.png': 'changed',
      'cards__new__phone.png': 'new',
      'gone__x__phone.png': 'missing',
      'Zla_Nazwa.png': 'invalid-name',
    });
    expect(htmlReport(entries, out!)).toContain('scr-org-01__seed__phone.diff.png');
    expect(prComment(entries)).toContain('visual-approved');
  });
});
