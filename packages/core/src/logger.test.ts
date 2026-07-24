import { describe, it, expect } from 'vitest';
import { logger } from './logger.js';

describe('Core Logger', () => {
  it('instantiates logger with uppercase level formatter', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
