import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { errorHttpStatus, type ErrorCode } from '../errors/codes.js';
import { Problem } from '../schemas/common.js';
import { routes, type Permission } from './routes.js';

const SECURITY: Record<Permission, Record<string, string[]>[]> = {
  PUBLIC: [],
  ORG: [{ org: [] }],
  'ORG:owner': [{ org: [] }],
  DEV: [{ device: [] }],
  JDG: [{ judge: [] }],
  'JDG:self': [{ judge: [] }],
  'DEV|JDG': [{ device: [] }, { judge: [] }],
};

const AUTH_ERRORS: Partial<Record<Permission, ErrorCode[]>> = {
  ORG: ['UNAUTHENTICATED'],
  'ORG:owner': ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'],
  DEV: ['UNAUTHENTICATED'],
  JDG: ['UNAUTHENTICATED'],
  'JDG:self': ['UNAUTHENTICATED', 'FORBIDDEN'],
  'DEV|JDG': ['UNAUTHENTICATED'],
};

function pathParams(path: string) {
  const names = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string);
  return names.length === 0 ? undefined : z.object(Object.fromEntries(names.map((n) => [n, z.string()])));
}

/** Rejestr OpenAPI zbudowany z tabeli tras (ADR-012). */
export function buildRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  // Bez `registry.register` (wymaga `.openapi()` na instancji zod generatora – pakiet CJS); schemat inline.
  const problem = Problem;
  for (const scheme of ['org', 'device', 'judge']) {
    registry.registerComponent('securitySchemes', scheme, {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  }

  for (const route of routes) {
    const errorCodes = [
      ...new Set([...(AUTH_ERRORS[route.permission] ?? []), ...route.errors, 'INTERNAL' as const]),
    ];
    const errorResponses: Record<
      string,
      { description: string; content: { 'application/problem+json': { schema: typeof problem } } }
    > = {};
    for (const code of errorCodes) {
      const status = errorHttpStatus[code];
      if (status === null) continue;
      const key = String(status);
      const description = errorResponses[key] ? `${errorResponses[key].description}, ${code}` : code;
      errorResponses[key] = { description, content: { 'application/problem+json': { schema: problem } } };
    }
    const headers = z.object({
      ...(route.ifMatch ? { 'If-Match': z.string() } : {}),
      ...(route.idempotent ? { 'Idempotency-Key': z.uuid().optional() } : {}),
    });

    registry.registerPath({
      method: route.method,
      path: route.path,
      operationId: route.operationId,
      summary: route.summary,
      security: SECURITY[route.permission],
      'x-permissions': route.permission,
      'x-error-codes': errorCodes,
      request: {
        params: pathParams(route.path),
        query: route.query,
        headers: route.ifMatch || route.idempotent ? headers : undefined,
        body: route.body ? { content: { 'application/json': { schema: route.body } } } : undefined,
      },
      responses: {
        [route.success.status]: route.success.schema
          ? { description: 'OK', content: { 'application/json': { schema: route.success.schema } } }
          : { description: 'OK' },
        ...errorResponses,
      },
    });
  }
  return registry;
}

/** Dokument OpenAPI 3.1 (`dist/openapi.json`). */
export type OpenApiDocument = ReturnType<OpenApiGeneratorV31['generateDocument']>;

export function buildOpenApiDocument(version = '1.0.0'): OpenApiDocument {
  return new OpenApiGeneratorV31(buildRegistry().definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'PoleChamp API',
      version,
      description:
        'Kontrakt REST PoleChamp (docs/01-architecture/03-api.md). Generowany z @polechamp/contracts.',
    },
    servers: [{ url: 'https://api.polechamp.app' }],
  });
}
