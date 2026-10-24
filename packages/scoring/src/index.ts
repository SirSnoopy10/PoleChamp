/**
 * @polechamp/scoring – czyste funkcje punktacji wspólne dla API, tabletu i PDF (ADR-006, ADR-011).
 * Bez zależności runtime i importów platformowych.
 */
export const PACKAGE_NAME = '@polechamp/scoring';

export * from './types.js';
export * from './fixed.js';
export * from './sheet.js';
export * from './templates.js';
export * from './aggregate.js';
export * from './rank.js';
export * from './format.js';
export * from './progress.js';
export * from './canonical.js';
