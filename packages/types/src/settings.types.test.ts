import { describe, it, expect } from "vitest";
import {
  UpdateProfileFormSchema,
  UpdateHouseholdFormSchema,
  BankAccountFormSchema,
  computeAccountAvailability,
  resolvePlanLabelKey,
  buildExportFileName,
  COMMON_TIMEZONES,
  AU_STATES,
} from "./index";

describe("Settings Types & Schemas", () => {
  describe("UpdateProfileFormSchema", () => {
    it("validates valid profile data", () => {
      const parsed = UpdateProfileFormSchema.parse({
        displayName: "Alice Smith",
        notificationEmail: "alice@example.com",
        phone: "+61412345678",
        timezone: "Australia/Sydney",
        showIcons: true,
        locale: "en-AU",
      });
      expect(parsed.displayName).toBe("Alice Smith");
      expect(parsed.notificationEmail).toBe("alice@example.com");
    });

    it("rejects empty name or invalid email", () => {
      expect(() =>
        UpdateProfileFormSchema.parse({
          displayName: "",
          notificationEmail: "alice@example.com",
        })
      ).toThrow();

      expect(() =>
        UpdateProfileFormSchema.parse({
          displayName: "Alice",
          notificationEmail: "not-an-email",
        })
      ).toThrow();
    });
  });

  describe("UpdateHouseholdFormSchema", () => {
    it("validates valid household data with AU 4-digit postcode", () => {
      const parsed = UpdateHouseholdFormSchema.parse({
        name: "Smith Household",
        currency: "AUD",
        timezone: "Australia/Sydney",
        country: "AU",
        state: "NSW",
        postcode: "2000",
      });
      expect(parsed.postcode).toBe("2000");
    });

    it("rejects non-4-digit postcode for Australia", () => {
      expect(() =>
        UpdateHouseholdFormSchema.parse({
          name: "Smith Household",
          currency: "AUD",
          timezone: "Australia/Sydney",
          country: "AU",
          state: "NSW",
          postcode: "200", // too short
        })
      ).toThrow("Australian postcodes must be exactly 4 digits");
    });

    it("accepts non-AU postcodes with letters/different lengths", () => {
      const parsed = UpdateHouseholdFormSchema.parse({
        name: "UK Household",
        currency: "GBP",
        timezone: "Europe/London",
        country: "GB",
        state: "Greater London",
        postcode: "SW1A 1AA",
      });
      expect(parsed.postcode).toBe("SW1A 1AA");
    });
  });

  describe("BankAccountFormSchema", () => {
    it("validates valid bank account and computes availability", () => {
      const parsed = BankAccountFormSchema.parse({
        name: "Everyday Account",
        bankProvider: "CBA",
        currentBalance: "1500.00",
        unbudgetedBuffer: "200.00",
        isPrivate: false,
      });
      expect(parsed.bankProvider).toBe("CBA");

      const avail = computeAccountAvailability(parsed.currentBalance, parsed.unbudgetedBuffer);
      expect(avail.actualBalance).toBe(1500);
      expect(avail.buffer).toBe(200);
      expect(avail.available).toBe(1300);
    });

    it("rejects buffer exceeding balance", () => {
      expect(() =>
        BankAccountFormSchema.parse({
          name: "Everyday Account",
          bankProvider: "CBA",
          currentBalance: "100.00",
          unbudgetedBuffer: "200.00",
          isPrivate: false,
        })
      ).toThrow("Unbudgeted buffer cannot exceed current balance");
    });

    it("rejects negative balances", () => {
      expect(() =>
        BankAccountFormSchema.parse({
          name: "Overdrawn Account",
          bankProvider: "CBA",
          currentBalance: "-50.00",
          unbudgetedBuffer: "0.00",
          isPrivate: false,
        })
      ).toThrow();
    });
  });

  describe("Subscription Helpers", () => {
    it("resolves status keys correctly", () => {
      expect(resolvePlanLabelKey("SUBSCRIBED")).toBe("subscription.planActive");
      expect(resolvePlanLabelKey("TRIALING")).toBe("subscription.trialActive");
      expect(resolvePlanLabelKey("TRIAL_GRACE")).toBe("subscription.trialGrace");
      expect(resolvePlanLabelKey("PAST_DUE")).toBe("subscription.pastDue");
      expect(resolvePlanLabelKey("CANCELED")).toBe("subscription.canceled");
      expect(resolvePlanLabelKey("EXPIRED")).toBe("subscription.expired");
      expect(resolvePlanLabelKey(undefined)).toBe("subscription.planFree");
    });

    it("builds consistent export file name", () => {
      expect(buildExportFileName("2026-10-03")).toBe("money-matters-backup-2026-10-03.zip");
    });
  });

  describe("Constants & Options", () => {
    it("has canonical timezones and states", () => {
      expect(COMMON_TIMEZONES.length).toBeGreaterThanOrEqual(10);
      expect(AU_STATES).toHaveLength(8);
      expect(AU_STATES.map((s) => s.code)).toContain("NSW");
    });
  });
});
