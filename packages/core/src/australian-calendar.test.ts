import { describe, it, expect } from "vitest";
import { isNonBankingDay, adjustForBankingCalendar, getSydneyTimezoneOffsetMinutes } from "./australian-calendar.js";

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
    expect(adjusted.toISOString().split("T")[0]).toBe("2026-04-02");
  });

  it("calculates Sydney timezone offset for AEST vs AEDT correctly", () => {
    const winterDate = new Date("2026-07-15T00:00:00Z"); // July = AEST (+10)
    const summerDate = new Date("2026-12-15T00:00:00Z"); // Dec = AEDT (+11)

    expect(getSydneyTimezoneOffsetMinutes(winterDate)).toBe(600);
    expect(getSydneyTimezoneOffsetMinutes(summerDate)).toBe(660);
  });
});
