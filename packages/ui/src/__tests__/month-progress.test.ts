import { describe, it, expect } from 'vitest';
import { monthProgress } from '../lib/month-progress';

describe('monthProgress', () => {
  it('calculates mid-month progress correctly for 31-day month', () => {
    const testDate = new Date(2026, 7, 15); // Aug 15, 2026
    const res = monthProgress(testDate);
    expect(res.daysElapsed).toBe(15);
    expect(res.daysInMonth).toBe(31);
    expect(res.elapsedPct).toBe(48); // 15/31 = 48.38%
  });

  it('handles first day of month', () => {
    const testDate = new Date(2026, 7, 1);
    const res = monthProgress(testDate);
    expect(res.daysElapsed).toBe(1);
    expect(res.daysInMonth).toBe(31);
    expect(res.elapsedPct).toBe(3); // 1/31 = 3.2%
  });

  it('handles last day of month', () => {
    const testDate = new Date(2026, 7, 31);
    const res = monthProgress(testDate);
    expect(res.daysElapsed).toBe(31);
    expect(res.daysInMonth).toBe(31);
    expect(res.elapsedPct).toBe(100);
  });

  it('handles leap year February', () => {
    const testDate = new Date(2028, 1, 29); // Feb 29, 2028
    const res = monthProgress(testDate);
    expect(res.daysElapsed).toBe(29);
    expect(res.daysInMonth).toBe(29);
    expect(res.elapsedPct).toBe(100);
  });
});
