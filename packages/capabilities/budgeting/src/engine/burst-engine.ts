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

function parseUtcDateParts(dateStr: string): Date | null {
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0));
  return isNaN(d.getTime()) ? null : d;
}

function parseUtcEndOfDayParts(dateStr: string): Date | null {
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
  return isNaN(d.getTime()) ? null : d;
}

export function generateBurstDates(
  rruleStr: string,
  startDateStr: string,
  endDateStr?: string | null,
  monthsAhead = 12,
  maxOccurrences = 1000,
  afterDateStr?: string | null
): Date[] {
  const dates: Date[] = [];
  const start = parseUtcDateParts(startDateStr);
  if (!start) {
    return dates;
  }

  const now = new Date();
  // Create strict cutoff in UTC
  const cutOff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead, now.getUTCDate(), 23, 59, 59, 999));

  let limitDate = cutOff;
  if (endDateStr) {
    const end = parseUtcEndOfDayParts(endDateStr);
    if (end && end < cutOff) {
      limitDate = end;
    }
  }

  // If afterDateStr is provided and already at or past the limitDate, return empty
  if (afterDateStr) {
    const after = parseUtcEndOfDayParts(afterDateStr);
    if (after && after >= limitDate) {
      return dates;
    }
  }

  try {
    const options = RRule.parseString(rruleStr);
    options.dtstart = start;
    if (options.until && options.until < limitDate) {
      limitDate = options.until;
    }
    options.until = limitDate;

    const rule = new RRule(options);

    let searchStart = start;
    if (afterDateStr) {
      const after = parseUtcDateParts(afterDateStr);
      if (after && after > start) {
        searchStart = after;
      }
    }

    // Generate occurrences between searchStart and limitDate
    const generated = rule.between(searchStart, limitDate, true);

    const afterClean = afterDateStr ? afterDateStr.slice(0, 10) : null;
    const filtered = afterClean
      ? generated.filter((d) => {
          const y = d.getUTCFullYear();
          const m = String(d.getUTCMonth() + 1).padStart(2, "0");
          const day = String(d.getUTCDate()).padStart(2, "0");
          const dUtcStr = `${y}-${m}-${day}`;
          return dUtcStr > afterClean;
        })
      : generated;

    return filtered.slice(0, maxOccurrences);
  } catch (e) {
    console.error("Failed to parse rrule", e);
    return dates;
  }
}

