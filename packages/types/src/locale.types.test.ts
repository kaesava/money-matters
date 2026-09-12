import { describe, it, expect } from "vitest";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  COUNTRY_DEFAULTS,
  DEFAULT_COUNTRY,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  CurrencyCodeSchema,
} from "./locale.types";

describe("Locale and Currency Types", () => {
  it("defines supported currencies with valid ISO codes, symbols, and minor units", () => {
    expect(SUPPORTED_CURRENCIES.AUD.symbol).toBe("$");
    expect(SUPPORTED_CURRENCIES.AUD.minorUnits).toBe(2);

    expect(SUPPORTED_CURRENCIES.JPY.symbol).toBe("¥");
    expect(SUPPORTED_CURRENCIES.JPY.minorUnits).toBe(0);

    expect(SUPPORTED_CURRENCIES.EUR.symbol).toBe("€");
    expect(SUPPORTED_CURRENCIES.EUR.minorUnits).toBe(2);

    expect(SUPPORTED_CURRENCIES.GBP.symbol).toBe("£");
    expect(SUPPORTED_CURRENCIES.GBP.minorUnits).toBe(2);
  });

  it("validates currency codes via CurrencyCodeSchema", () => {
    expect(CurrencyCodeSchema.parse("AUD")).toBe("AUD");
    expect(CurrencyCodeSchema.parse("usd")).toBe("usd");
    expect(() => CurrencyCodeSchema.parse("INVALID")).toThrow();
  });

  it("provides sensible defaults for supported countries", () => {
    expect(COUNTRY_DEFAULTS.AU.currency).toBe("AUD");
    expect(COUNTRY_DEFAULTS.AU.timezone).toBe("Australia/Sydney");

    expect(COUNTRY_DEFAULTS.JP.currency).toBe("JPY");
    expect(COUNTRY_DEFAULTS.JP.timezone).toBe("Asia/Tokyo");

    expect(COUNTRY_DEFAULTS.US.currency).toBe("USD");
    expect(COUNTRY_DEFAULTS.GB.currency).toBe("GBP");
  });

  it("has top-level default fallbacks", () => {
    expect(DEFAULT_COUNTRY).toBe("AU");
    expect(DEFAULT_CURRENCY).toBe("AUD");
    expect(DEFAULT_TIMEZONE).toBe("Australia/Sydney");
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(4);
  });
});
