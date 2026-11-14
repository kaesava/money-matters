import { getCachedDateFormat } from "@money-matters/core";
export function formatDateShort(
  dateStr?: string,
  fallbackLabel?: string,
  timeZone: string = "UTC",
  locale: string = "en"
): string {
  if (!dateStr) return fallbackLabel || "";
  try {
    let dateObj: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      dateObj = new Date(dateStr);
    }
    if (isNaN(dateObj.getTime())) return fallbackLabel || dateStr;
    const resolvedLocale = locale === "auto" ? undefined : locale;
    return getCachedDateFormat(resolvedLocale ?? "en-AU", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      timeZone,
    }).format(dateObj);
  } catch {
    return fallbackLabel || dateStr;
  }
}
