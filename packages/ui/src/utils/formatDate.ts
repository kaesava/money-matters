/**
 * Formats a date string, Date object, or timestamp into the regional locale format:
 * - Australia (en-AU): "31/12/2026"
 * - Canada (en-CA): "2026-12-31"
 * - United States (en-US): "12/31/2026"
 * - Japan (ja-JP): "2026/12/31"
 * Handles UTC ISO strings and YYYY-MM-DD cleanly without timezone off-by-one errors.
 */
export function fmtDate(
  input: string | Date | number | null | undefined,
  timeZone: string = "Australia/Sydney",
  locale: string = "en-AU"
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

    const resolvedLocale = locale === "auto" ? undefined : locale;
    return new Intl.DateTimeFormat(resolvedLocale, {
      timeZone,
    }).format(dateObj);
  } catch {
    return "N/A";
  }
}

/**
 * Formats a date into medium style (e.g. "31 Dec 2026" or "Dec 31, 2026" for Canada/US).
 */
export function fmtDateMedium(
  input: string | Date | number | null | undefined,
  timeZone: string = "Australia/Sydney",
  locale: string = "en-AU"
): string {
  if (!input) return "N/A";

  try {
    let dateObj: Date;
    if (typeof input === "string") {
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

    const resolvedLocale = locale === "auto" ? undefined : locale;
    return new Intl.DateTimeFormat(resolvedLocale, {
      dateStyle: "medium",
      timeZone,
    }).format(dateObj);
  } catch {
    return "N/A";
  }
}
