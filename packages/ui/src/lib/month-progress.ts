/**
 * Returns days elapsed, days in month, and percentage of month elapsed (0-100).
 */
export function monthProgress(now: Date = new Date()): { daysElapsed: number; daysInMonth: number; elapsedPct: number } {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.min(now.getDate(), daysInMonth);
  const elapsedPct = Math.min(100, Math.max(0, Math.round((daysElapsed / daysInMonth) * 100)));
  return { daysElapsed, daysInMonth, elapsedPct };
}
