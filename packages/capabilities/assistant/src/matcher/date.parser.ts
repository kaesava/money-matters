/**
 * Safely extracts dates from Australian informal text (e.g., "23-Jan", "23 Jan", "2026-01-23", "today", "yesterday").
 * Uses timezone-aware Australia/Sydney dates.
 */
export function parseDate(text: string): string | undefined {
  const sydneyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  const todayStr = sydneyFormatter.format(new Date()); // YYYY-MM-DD
  const [currentYearStr] = todayStr.split("-");
  const currentYear = parseInt(currentYearStr || "2026", 10);

  if (/\btoday\b/i.test(text)) return todayStr;

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const monthNames: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    january: "01", february: "02", march: "03", april: "04", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  };

  const dayMonthMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?[-/\s]+([a-z]+)\b/i);
  if (dayMonthMatch && dayMonthMatch[1] && dayMonthMatch[2]) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthKey = dayMonthMatch[2].toLowerCase();
    const month = monthNames[monthKey];
    if (day >= 1 && day <= 31 && month) {
      const paddedDay = day < 10 ? `0${day}` : `${day}`;
      return `${currentYear}-${month}-${paddedDay}`;
    }
  }

  return undefined;
}
