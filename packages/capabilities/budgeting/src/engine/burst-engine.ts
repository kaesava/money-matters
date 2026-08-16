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
export function generateBurstDates(
  rruleStr: string,
  startDateStr: string,
  endDateStr?: string | null,
  monthsAhead = 12,
  maxOccurrences = 1000
): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return dates;
  const now = new Date();

  const cutOff = new Date(now.getFullYear(), now.getMonth() + monthsAhead, now.getDate());
  const endDate = endDateStr ? new Date(endDateStr) : null;

  let current = new Date(start.getTime());

  // Parse rrule interval and freq
  const isWeekly = rruleStr.includes("FREQ=WEEKLY");
  const isFortnightly = isWeekly && rruleStr.includes("INTERVAL=2");
  const isMonthly = rruleStr.includes("FREQ=MONTHLY");
  const isYearly = rruleStr.includes("FREQ=YEARLY");

  let stepDays = 7;
  if (isFortnightly) stepDays = 14;

  let iterations = 0;
  while (iterations < 365) {
    iterations++;

    if (endDate && current > endDate) break;

    // Add occurrence if it's today or in future
    if (current >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      dates.push(new Date(current.getTime()));
    }

    // Stop condition: reached max occurrences OR passed cutoff date
    if (dates.length >= maxOccurrences || current > cutOff) {
      break;
    }

    if (isMonthly) {
      const targetYear = current.getFullYear() + Math.floor((current.getMonth() + 1) / 12);
      const targetMonth = (current.getMonth() + 1) % 12;
      const originalDay = start.getDate();
      const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      current = new Date(targetYear, targetMonth, Math.min(originalDay, daysInTargetMonth));
    } else if (isYearly) {
      const targetYear = current.getFullYear() + 1;
      const originalMonth = start.getMonth();
      const originalDay = start.getDate();
      const daysInTargetMonth = new Date(targetYear, originalMonth + 1, 0).getDate();
      current = new Date(targetYear, originalMonth, Math.min(originalDay, daysInTargetMonth));
    } else {
      current = new Date(current.getTime() + stepDays * 24 * 60 * 60 * 1000);
    }
  }

  return dates;
}

