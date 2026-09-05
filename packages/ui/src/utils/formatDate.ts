/**
 * Formats a date string, Date object, or timestamp into standard Australian format: "26 Aug 2026".
 * Handles UTC ISO strings cleanly without timezone off-by-one errors in AEST/AEDT.
 */
export function fmtDate(
  input: string | Date | number | null | undefined,
  timeZone: string = "Australia/Sydney"
): string {
  if (!input) return "N/A";

  try {
    let dateObj: Date;
    if (typeof input === "string") {
      // Handle YYYY-MM-DD string without UTC offset interpretation shift
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [year, month, day] = input.split("-").map(Number);
        dateObj = new Date(year, month - 1, day);
      } else {
        dateObj = new Date(input);
      }
    } else if (typeof input === "number") {
      dateObj = new Date(input);
    } else {
      dateObj = input;
    }

    if (isNaN(dateObj.getTime())) return "N/A";

    return new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      timeZone,
    }).format(dateObj);
  } catch {
    return "N/A";
  }
}
