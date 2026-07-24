/**
 * Pure helper to compute future occurrence dates given an RRULE frequency string and start date, up to 12 months in advance.
 */
export function generateBurstDates(
  rruleStr: string,
  startDateStr: string,
  endDateStr?: string | null,
  monthsAhead = 12
): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDateStr);
  const now = new Date();

  const cutOff = new Date(now.getFullYear(), now.getMonth() + monthsAhead, now.getDate());
  const endDate = endDateStr ? new Date(endDateStr) : null;
  const maxEnd = endDate && endDate < cutOff ? endDate : cutOff;

  let current = new Date(start.getTime());

  // Parse rrule interval and freq
  const isWeekly = rruleStr.includes("FREQ=WEEKLY");
  const isFortnightly = isWeekly && rruleStr.includes("INTERVAL=2");
  const isMonthly = rruleStr.includes("FREQ=MONTHLY");
  const isYearly = rruleStr.includes("FREQ=YEARLY");

  let stepDays = 7;
  if (isFortnightly) stepDays = 14;

  let iterations = 0;
  while (current <= maxEnd && iterations < 365) {
    iterations++;
    if (current >= now) {
      dates.push(new Date(current.getTime()));
    }

    if (isMonthly) {
      current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
    } else if (isYearly) {
      current = new Date(current.getFullYear() + 1, current.getMonth(), current.getDate());
    } else {
      current = new Date(current.getTime() + stepDays * 24 * 60 * 60 * 1000);
    }
  }

  return dates;
}
