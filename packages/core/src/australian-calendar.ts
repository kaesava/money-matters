/**
 * Australian Financial & Banking Calendar Utilities
 * 
 * Provides business day adjustment for public holidays (BECS settlement system)
 * and timezone resolution (AEST/AEDT) for scheduled notification crons.
 */

/** Known Australian national and state public holiday calendar dates (ISO YYYY-MM-DD). */
const AU_NATIONAL_HOLIDAYS = new Set<string>([
  "2026-01-01", // New Year's Day
  "2026-01-26", // Australia Day
  "2026-04-03", // Good Friday
  "2026-04-06", // Easter Monday
  "2026-04-25", // ANZAC Day
  "2026-06-08", // King's Birthday (NSW/VIC/ACT/TAS/SA)
  "2026-10-05", // Labour Day (NSW/ACT/SA)
  "2026-12-25", // Christmas Day
  "2026-12-26", // Boxing Day
  "2026-12-28", // Boxing Day (observed)
  "2027-01-01", // New Year's Day
  "2027-01-26", // Australia Day
]);

export function getAestIsoDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(date);
}

/**
 * Checks whether a given Date is a weekend or an Australian banking public holiday.
 *
 * @param date - The date to check
 * @returns True if the date is a weekend or public holiday
 */
export function isNonBankingDay(date: Date): boolean {
  const dayOfWeek = date.getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return true; // Sunday = 0, Saturday = 6

  const isoDate = getAestIsoDate(date);
  return isoDate ? AU_NATIONAL_HOLIDAYS.has(isoDate) : false;
}

/**
 * Adjusts an expected paycheck or bill settlement date for Australian public holidays and weekends.
 *
 * @param scheduledDate - Initial scheduled date
 * @param shiftDirection - Direction to shift: PREVIOUS_BUSINESS_DAY (default) or NEXT_BUSINESS_DAY
 * @returns Adjusted business day Date
 */
export function adjustForBankingCalendar(
  scheduledDate: Date,
  shiftDirection: "PREVIOUS_BUSINESS_DAY" | "NEXT_BUSINESS_DAY" = "PREVIOUS_BUSINESS_DAY"
): Date {
  const result = new Date(scheduledDate.getTime());
  const step = shiftDirection === "PREVIOUS_BUSINESS_DAY" ? -1 : 1;

  while (isNonBankingDay(result)) {
    result.setUTCDate(result.getUTCDate() + step);
  }

  return result;
}

/**
 * Determines current Sydney timezone offset in minutes (+600 for AEST UTC+10, +660 for AEDT UTC+11).
 *
 * @param date - Date object to evaluate
 * @returns Offset in minutes
 */
export function getSydneyTimezoneOffsetMinutes(date: Date): number {
  // Daylight savings in Australia (Sydney/Melbourne):
  // Starts 1st Sunday in October (2:00 AM) -> AEDT (+11:00 = 660 mins)
  // Ends 1st Sunday in April (3:00 AM) -> AEST (+10:00 = 600 mins)
  const month = date.getUTCMonth(); // 0 = Jan, 3 = Apr, 9 = Oct
  
  if (month > 3 && month < 9) {
    // May to September: strictly AEST (+10)
    return 600;
  }
  if (month === 0 || month === 1 || month === 2 || month === 10 || month === 11) {
    // Nov, Dec, Jan, Feb, Mar: strictly AEDT (+11)
    return 660;
  }

  // April and October transition months evaluation
  const day = date.getUTCDate();
  const dayOfWeek = date.getUTCDay();

  if (month === 3) { // April - transition back to AEST on 1st Sunday
    const firstSunday = day - dayOfWeek;
    return day < firstSunday ? 660 : 600;
  } else { // October - transition to AEDT on 1st Sunday
    const firstSunday = day - dayOfWeek;
    return day >= firstSunday ? 660 : 600;
  }
}
