import { describe, expect, it } from 'vitest';
import { SHARED_PACKAGES } from '../src/index.js';

describe('IMP-001: importy workspace', () => {
  it('apps/api importuje @polechamp/scoring i @polechamp/contracts', () => {
    expect(SHARED_PACKAGES).toEqual(['@polechamp/scoring', '@polechamp/contracts']);
  });
});
