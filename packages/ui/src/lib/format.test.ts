import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  fmtBalance,
  fmtTransactionAmount,
  getCurrencySymbol,
  getCurrencyMinorUnits,
  fmtDateTime,
} from "./format.js";

describe("UI Format Utilities", () => {
  it("formats AUD currency correctly in en-AU", () => {
    const formatted = formatCurrency(1234.56, "en-AU", "AUD");
    expect(formatted).toContain("1,234.56");
    expect(formatted).toContain("$");
  });

  it("formats JPY currency with 0 decimal places in ja-JP", () => {
    const formatted = formatCurrency(1234, "ja-JP", "JPY");
    expect(formatted).toContain("1,234");
    expect(formatted).not.toContain(".00");
  });

  it("handles null, undefined, and zero correctly", () => {
    expect(formatCurrency(null, "en-AU", "AUD")).toContain("0.00");
    expect(formatCurrency(undefined, "en-AU", "AUD")).toContain("0.00");
    expect(formatCurrency(0, "en-AU", "AUD")).toContain("0.00");
    expect(fmtBalance(null, "en-AU", "AUD")).toContain("0.00");
  });

  it("extracts currency symbols correctly via getCurrencySymbol", () => {
    expect(getCurrencySymbol("en-AU", "AUD")).toBe("$");
    expect(getCurrencySymbol("en-US", "USD")).toBe("$");
    expect(getCurrencySymbol("en-GB", "GBP")).toBe("£");
  });

  it("returns correct minor units for currencies", () => {
    expect(getCurrencyMinorUnits("AUD")).toBe(2);
    expect(getCurrencyMinorUnits("USD")).toBe(2);
    expect(getCurrencyMinorUnits("JPY")).toBe(0);
    expect(getCurrencyMinorUnits("KRW")).toBe(0);
  });

  it("formats transaction amounts with plus and minus signs", () => {
    const credit = fmtTransactionAmount(50.5, "CREDIT", "en-AU", "AUD");
    expect(credit).toMatch(/^\+/);
    expect(credit).toContain("50.50");

    const debit = fmtTransactionAmount(25, "DEBIT", "en-AU", "AUD");
    expect(debit).toMatch(/^-/);
    expect(debit).toContain("25.00");
  });

  it("formats timestamps with timezone", () => {
    const d = new Date("2026-08-26T12:00:00Z");
    const formatted = fmtDateTime(d, "Australia/Sydney");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Aug");
  });
});
