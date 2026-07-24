import { describe, it, expect } from 'vitest';
import { formatAUD, formatAUDCompact, formatDate, formatRelativeDate } from './format.js';

describe('Mobile Format Utilities', () => {
  it('formats AUD amounts correctly', () => {
    expect(formatAUD(123.45)).toBe('$123.45');
    expect(formatAUD('50')).toBe('$50.00');
    expect(formatAUD('invalid')).toBe('$0.00');
  });

  it('formats compact AUD amounts', () => {
    expect(formatAUDCompact(500)).toBe('$500');
    expect(formatAUDCompact(2500)).toBe('$2.5k');
    expect(formatAUDCompact('invalid')).toBe('$0');
  });

  it('formats dates in en-AU format', () => {
    const formatted = formatDate('2026-08-15');
    expect(formatted).toContain('2026');
    expect(formatDate('invalid')).toBe('');
  });

  it('formats relative dates accurately', () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    expect(formatRelativeDate(today)).toBe('Today');
    expect(formatRelativeDate(yesterday)).toBe('Yesterday');
    expect(formatRelativeDate('invalid')).toBe('');
  });
});
