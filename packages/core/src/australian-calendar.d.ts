/**
 * Australian Financial & Banking Calendar Utilities
 *
 * Provides business day adjustment for public holidays (BECS settlement system)
 * and timezone resolution (AEST/AEDT) for scheduled notification crons.
 */
/**
 * Checks whether a given Date is a weekend or an Australian banking public holiday.
 *
 * @param date - The date to check
 * @returns True if the date is a weekend or public holiday
 */
export declare function isNonBankingDay(date: Date): boolean;
/**
 * Adjusts an expected paycheck or bill settlement date for Australian public holidays and weekends.
 *
 * @param scheduledDate - Initial scheduled date
 * @param shiftDirection - Direction to shift: PREVIOUS_BUSINESS_DAY (default) or NEXT_BUSINESS_DAY
 * @returns Adjusted business day Date
 */
export declare function adjustForBankingCalendar(scheduledDate: Date, shiftDirection?: "PREVIOUS_BUSINESS_DAY" | "NEXT_BUSINESS_DAY"): Date;
/**
 * Determines current Sydney timezone offset in minutes (+600 for AEST UTC+10, +660 for AEDT UTC+11).
 *
 * @param date - Date object to evaluate
 * @returns Offset in minutes
 */
export declare function getSydneyTimezoneOffsetMinutes(date: Date): number;
//# sourceMappingURL=australian-calendar.d.ts.map