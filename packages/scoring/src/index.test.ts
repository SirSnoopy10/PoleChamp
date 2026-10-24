import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index.js';

describe('@polechamp/scoring – szkielet', () => {
  it('eksportuje nazwę pakietu', () => {
    expect(PACKAGE_NAME).toBe('@polechamp/scoring');
  });
});
