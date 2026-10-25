/**
 * @polechamp/contracts – jedyne źródło schematów API dla NestJS, aplikacji mobilnej i generatora OpenAPI (ADR-012).
 */
export const PACKAGE_NAME = '@polechamp/contracts';

export * from './errors/codes.js';
export * from './validation.js';
export * from './privacy.js';
export * from './schemas/common.js';
export * from './schemas/auth.js';
export * from './schemas/tournaments.js';
export * from './schemas/categories.js';
export * from './schemas/entries.js';
export * from './schemas/judges.js';
export * from './schemas/sync.js';
export * from './schemas/results.js';
export * from './events/index.js';
export { routes, type RouteDef, type Permission, type HttpMethod } from './openapi/routes.js';
