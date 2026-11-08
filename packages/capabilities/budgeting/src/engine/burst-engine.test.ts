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
    const fmtAest = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
    const firstDateStr = fmtAest(dates[0]);
    expect(firstDateStr).toBe('2026-08-01');
  });

  it('generates all occurrences from past startDate up to today + 12 months horizon (or endDate if sooner)', () => {
    const fmtAest = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
    // Anchor to 1st of month so months with fewer than 31 days don't skip in standard RRULE
    const now = new Date();
    const anchorDay = 1;
    // Start date 12 months ago
    const pastStart = fmtAest(new Date(now.getFullYear(), now.getMonth() - 12, anchorDay));
    // End date 6 months in the future -> expecting ~18-19 monthly occurrences (12 past + 6 future + start)
    const futureEnd6 = fmtAest(new Date(now.getFullYear(), now.getMonth() + 6, anchorDay));
    const dates18 = generateBurstDates('FREQ=MONTHLY', pastStart, futureEnd6, 12);
    expect(dates18.length).toBeGreaterThanOrEqual(18);
    expect(dates18.length).toBeLessThanOrEqual(20);

    // End date 24 months in future -> capped by 12 months ahead cutoff -> expecting ~24-25 monthly occurrences (12 past + 12 future + start)
    const futureEnd24 = fmtAest(new Date(now.getFullYear(), now.getMonth() + 24, anchorDay));
    const dates24 = generateBurstDates('FREQ=MONTHLY', pastStart, futureEnd24, 12);
    expect(dates24.length).toBeGreaterThanOrEqual(24);
    expect(dates24.length).toBeLessThanOrEqual(26);
  });

  it('supports incremental bursts with afterDateStr strictly excluding prior occurrences', () => {
    const fmtAest = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
    const startDate = '2026-01-01';
    const allDates = generateBurstDates('FREQ=MONTHLY', startDate, null, 12);
    expect(allDates.length).toBeGreaterThan(6);

    const fifthDateStr = fmtAest(allDates[4]);
    // Incremental burst using 5th date as afterDateStr
    const incrementalDates = generateBurstDates('FREQ=MONTHLY', startDate, null, 12, 1000, fifthDateStr);

    expect(incrementalDates.length).toBe(allDates.length - 5);
    for (const d of incrementalDates) {
      expect(fmtAest(d) > fifthDateStr).toBe(true);
    }
    // Verify first incremental date is the 6th date
    expect(fmtAest(incrementalDates[0])).toBe(fmtAest(allDates[5]));
  });

  it('preserves bi-weekly phase alignment in incremental burst', () => {
    const fmtAest = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
    const startDate = '2026-01-01'; // Thursday
    const fullFortnightly = generateBurstDates('FREQ=WEEKLY;INTERVAL=2', startDate, null, 6);
    expect(fullFortnightly.length).toBeGreaterThan(4);

    const thirdDateStr = fmtAest(fullFortnightly[2]);
    const incrementalFortnightly = generateBurstDates(
      'FREQ=WEEKLY;INTERVAL=2',
      startDate,
      null,
      6,
      1000,
      thirdDateStr
    );

    expect(incrementalFortnightly.length).toBe(fullFortnightly.length - 3);
    expect(fmtAest(incrementalFortnightly[0])).toBe(fmtAest(fullFortnightly[3]));
  });

  it('returns empty array when afterDateStr meets or exceeds limitDate', () => {
    const now = new Date();
    const futureDate = new Date(now.getFullYear(), now.getMonth() + 13, 1).toISOString().slice(0, 10);
    const dates = generateBurstDates('FREQ=MONTHLY', '2026-01-01', null, 12, 1000, futureDate);
    expect(dates).toHaveLength(0);
  });
});
