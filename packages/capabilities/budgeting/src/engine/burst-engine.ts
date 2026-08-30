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
import * as rruleNs from "rrule";
const rrulePkg: any = rruleNs;
const RRule = (rrulePkg.RRule || rrulePkg["default"]?.RRule || rrulePkg["default"]) as typeof rruleNs.RRule;

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

  // Create a strict cutoff based on the current date + N months
  const cutOff = new Date(now.getFullYear(), now.getMonth() + monthsAhead, now.getDate());

  let limitDate = cutOff;
  if (endDateStr) {
    const end = new Date(endDateStr);
    if (!isNaN(end.getTime()) && end < cutOff) {
      limitDate = end;
    }
  }

  try {
    const options = RRule.parseString(rruleStr);
    options.dtstart = start;
    options.until = limitDate; // RRule handles until inclusive

    const rule = new RRule(options);

    // We only care about occurrences from "today" forwards (even if dtstart was in the past)
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Generate dates using rrule. 
    // We add true as the 3rd argument to `between` to ensure it's inclusive of `todayLocal` and `limitDate`.
    const generated = rule.between(todayLocal, limitDate, true);

    return generated.slice(0, maxOccurrences);
  } catch (e) {
    // Fallback if rrule string parsing fails (should not happen for valid generated rrules)
    console.error("Failed to parse rrule", e);
    return dates;
  }
}

