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

  it('includes past occurrences starting from startDate when startDate is in the past', () => {
    const dates = generateBurstDates('FREQ=WEEKLY', '2026-08-01', null, 2);
    // 2026-08-01 is in the past; first generated date should match or equal the start date
    expect(dates.length).toBeGreaterThan(0);
    const firstDateStr = dates[0].toISOString().split('T')[0];
    expect(firstDateStr).toBe('2026-08-01');
  });

  it('generates all occurrences from past startDate up to today + 12 months horizon (or endDate if sooner)', () => {
    const now = new Date();
    // Start date 12 months ago
    const pastStart = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate()).toISOString().split('T')[0];
    // End date 6 months in the future -> expecting ~18-19 monthly occurrences (12 past + 6 future + start)
    const futureEnd6 = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).toISOString().split('T')[0];
    const dates18 = generateBurstDates('FREQ=MONTHLY', pastStart, futureEnd6, 12);
    expect(dates18.length).toBeGreaterThanOrEqual(18);
    expect(dates18.length).toBeLessThanOrEqual(20);

    // End date 24 months in future -> capped by 12 months ahead cutoff -> expecting ~24-25 monthly occurrences (12 past + 12 future + start)
    const futureEnd24 = new Date(now.getFullYear(), now.getMonth() + 24, now.getDate()).toISOString().split('T')[0];
    const dates24 = generateBurstDates('FREQ=MONTHLY', pastStart, futureEnd24, 12);
    expect(dates24.length).toBeGreaterThanOrEqual(24);
    expect(dates24.length).toBeLessThanOrEqual(26);
  });
});
