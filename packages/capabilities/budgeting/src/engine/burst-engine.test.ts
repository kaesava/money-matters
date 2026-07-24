import { describe, it, expect } from 'vitest';
import { generateBurstDates } from './burst-engine.js';

describe('Recurrence Burst Date Engine', () => {
  it('generates weekly burst dates up to cutoff window', () => {
    const dates = generateBurstDates('FREQ=WEEKLY', '2026-08-01', null, 2);
    expect(dates.length).toBeGreaterThan(0);
    expect(dates[0]).toBeInstanceOf(Date);
  });

  it('generates fortnightly burst dates with INTERVAL=2', () => {
    const dates = generateBurstDates('FREQ=WEEKLY;INTERVAL=2', '2026-08-01', null, 3);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('generates monthly burst dates', () => {
    const dates = generateBurstDates('FREQ=MONTHLY', '2026-08-01', null, 3);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('respects end date bounds if provided', () => {
    const dates = generateBurstDates('FREQ=WEEKLY', '2026-08-01', '2026-08-15', 6);
    expect(dates.length).toBeLessThanOrEqual(3);
  });
});
