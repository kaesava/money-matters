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
const rrulePkg = rruleNs as unknown as { RRule?: typeof rruleNs.RRule; default?: { RRule?: typeof rruleNs.RRule } };
const RRule = (rrulePkg.RRule || rrulePkg["default"]?.RRule || rrulePkg["default"]) as typeof rruleNs.RRule;

export function generateBurstDates(
  rruleStr: string,
  startDateStr: string,
  endDateStr?: string | null,
  monthsAhead = 12,
  maxOccurrences = 1000,
  afterDateStr?: string | null
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

  // If afterDateStr is provided and already at or past the limitDate, return empty
  if (afterDateStr) {
    const after = new Date(afterDateStr);
    if (!isNaN(after.getTime()) && after >= limitDate) {
      return dates;
    }
  }

  try {
    const options = RRule.parseString(rruleStr);
    options.dtstart = start;
    options.until = limitDate; // RRule handles until inclusive

    const rule = new RRule(options);

    let searchStart = start;
    if (afterDateStr) {
      const after = new Date(afterDateStr);
      if (!isNaN(after.getTime()) && after > start) {
        searchStart = after;
      }
    }

    // Generate occurrences between searchStart and limitDate
    const generated = rule.between(searchStart, limitDate, true);

    const filtered = afterDateStr
      ? generated.filter((d) => {
          const y = d.getUTCFullYear();
          const m = String(d.getUTCMonth() + 1).padStart(2, "0");
          const day = String(d.getUTCDate()).padStart(2, "0");
          const dUtcStr = `${y}-${m}-${day}`;
          return dUtcStr > afterDateStr;
        })
      : generated;

    return filtered.slice(0, maxOccurrences);
  } catch (e) {
    // Fallback if rrule string parsing fails (should not happen for valid generated rrules)
    console.error("Failed to parse rrule", e);
    return dates;
  }
}

