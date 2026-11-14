import { describe, it, expect } from "vitest";
import {
  getTenantDateString,
  formatCurrency,
  formatDate,
  formatDateTime,
  toCents,
  toDollars,
} from "./formatters.js";

describe("formatters", () => {
  it("formats UTC midnight-adjacent timestamp to local Australia/Sydney date", () => {
    const utcDate = new Date("2026-11-13T13:30:00Z"); // 2026-11-14T00:30:00+11:00
    expect(getTenantDateString(utcDate, { timezone: "Australia/Sydney" })).toBe("2026-11-14");
    expect(getTenantDateString(utcDate, { timezone: "UTC" })).toBe("2026-11-13");
  });

  it("formats currency and handles null/invalid inputs", () => {
    expect(formatCurrency(1234.5, { country: "AU", currency: "AUD", locale: "en-AU" })).toContain("1,234.50");
    expect(formatCurrency(null)).toBe("");
    expect(formatCurrency("not-a-number")).toBe("");
  });

  it("formats dates and datetimes safely", () => {
    const d = new Date("2026-11-14T02:00:00Z");
    expect(formatDate(d, { timezone: "Australia/Sydney", locale: "en-AU" })).toContain("2026");
    expect(formatDateTime(d, { timezone: "Australia/Sydney", locale: "en-AU" })).toContain("2026");
    expect(formatDate(null)).toBe("");
    expect(formatDateTime(undefined)).toBe("");
  });

  it("converts between dollars and integer cents", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents("12.34")).toBe(1234);
    expect(toCents("bad")).toBe(0);
    expect(toDollars(1999)).toBe(19.99);
  });
});
