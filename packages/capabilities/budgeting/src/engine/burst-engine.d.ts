/**
 * Recurrence Burst Date Calculator
 *
 * Computes future occurrence timestamps from RRULE recurrence patterns (weekly, fortnightly, monthly, yearly).
 */
/**
 * Pure helper to compute future occurrence dates given an RRULE frequency string and start date, up to N months in advance.
 *
 * @param rruleStr - RRULE frequency specification (e.g. 'FREQ=WEEKLY;INTERVAL=2')
 * @param startDateStr - ISO start date string
 * @param endDateStr - Optional ISO end date string constraint
 * @param monthsAhead - Projection window limit in months (defaults to 12)
 * @returns Array of Date instances for expected future occurrences
 */
export declare function generateBurstDates(rruleStr: string, startDateStr: string, endDateStr?: string | null, monthsAhead?: number, maxOccurrences?: number): Date[];
//# sourceMappingURL=burst-engine.d.ts.map