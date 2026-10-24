import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument } from './document.js';

/** `pnpm --filter @polechamp/contracts openapi` → `dist/openapi.json` (IMP-066). */
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/openapi.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
console.log(`OpenAPI → ${out}`);
