import { describe, it, expect } from "vitest";
import { isNonBankingDay, adjustForBankingCalendar, getSydneyTimezoneOffsetMinutes, todayInZone, calendarDaysBetween } from "./australian-calendar.js";

describe("Australian Calendar & Banking Settlement Utilities", () => {
  it("correctly identifies weekends and public holidays as non-banking days", () => {
    const saturday = new Date("2026-08-01T00:00:00Z");
    const goodFriday = new Date("2026-04-03T00:00:00Z");
    const regularWednesday = new Date("2026-08-05T00:00:00Z");

    expect(isNonBankingDay(saturday)).toBe(true);
    expect(isNonBankingDay(goodFriday)).toBe(true);
    expect(isNonBankingDay(regularWednesday)).toBe(false);
  });

  it("shifts scheduled payment dates to previous business day by default", () => {
    const goodFriday = new Date("2026-04-03T12:00:00Z"); // Friday public holiday
    const adjusted = adjustForBankingCalendar(goodFriday, "PREVIOUS_BUSINESS_DAY");

    // Thursday April 2nd is the previous business day before Good Friday
    const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(adjusted);
    expect(dateStr).toBe("2026-04-02");
  });

  it("calculates Sydney timezone offset for AEST vs AEDT correctly", () => {
    const winterDate = new Date("2026-07-15T00:00:00Z"); // July = AEST (+10)
    const summerDate = new Date("2026-12-15T00:00:00Z"); // Dec = AEDT (+11)

    expect(getSydneyTimezoneOffsetMinutes(winterDate)).toBe(600);
    expect(getSydneyTimezoneOffsetMinutes(summerDate)).toBe(660);
  });

  it("calculates todayInZone across different Australian timezones", () => {
    // 2026-06-01 15:00:00 UTC is:
    // Sydney (UTC+10): 2026-06-02 01:00 -> "2026-06-02"
    // Perth (UTC+8): 2026-06-01 23:00 -> "2026-06-01"
    const instant = new Date("2026-06-01T15:00:00Z");
    expect(todayInZone("Australia/Sydney", instant)).toBe("2026-06-02");
    expect(todayInZone("Australia/Perth", instant)).toBe("2026-06-01");
  });

  it("calculates calendar days between dates correctly without time offset drift", () => {
    expect(calendarDaysBetween("2026-10-25", "2026-10-25")).toBe(0);
    expect(calendarDaysBetween("2026-10-25", "2026-10-26")).toBe(1);
    expect(calendarDaysBetween("2026-10-25", "2026-11-08")).toBe(14);
    expect(calendarDaysBetween("2026-11-08", "2026-10-25")).toBe(-14);
  });
});
