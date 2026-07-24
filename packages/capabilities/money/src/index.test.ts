import { describe, it, expect } from 'vitest';
import * as moneyCap from './index.js';

describe('Capability Money', () => {
  it('exports money capability workspace module cleanly', () => {
    expect(moneyCap).toBeDefined();
  });
});
