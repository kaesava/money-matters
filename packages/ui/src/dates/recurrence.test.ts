import { describe, it, expect } from "vitest";
import {
  parseRecurrenceRule,
  buildRecurrenceRule,
  formatScheduleSummary,
  formatRecurrenceLabel,
  formatRecurrenceSuffix,
} from "./recurrence";

describe("recurrence utils", () => {
  describe("parseRecurrenceRule", () => {
    it("handles monthly with interval > 1", () => {
      const res = parseRecurrenceRule("FREQ=MONTHLY;INTERVAL=2");
      expect(res).toEqual({ isRecurring: true, frequency: "MONTHLY", interval: 2 });
    });

    it("handles standard monthly", () => {
      const res = parseRecurrenceRule("FREQ=MONTHLY");
      expect(res).toEqual({ isRecurring: true, frequency: "MONTHLY", interval: 1 });
    });

    it("handles fortnightly INTERVAL=2", () => {
      const res = parseRecurrenceRule("FREQ=WEEKLY;INTERVAL=2");
      expect(res).toEqual({ isRecurring: true, frequency: "FORTNIGHTLY", interval: 1 });
    });

    it("preserves weekly choice for INTERVAL=2 when preferredFrequency is WEEKLY", () => {
      const res = parseRecurrenceRule("FREQ=WEEKLY;INTERVAL=2", "WEEKLY");
      expect(res).toEqual({ isRecurring: true, frequency: "WEEKLY", interval: 2 });
    });

    it("handles custom fortnightly INTERVAL=4", () => {
      const res = parseRecurrenceRule("FREQ=WEEKLY;INTERVAL=4");
      expect(res).toEqual({ isRecurring: true, frequency: "FORTNIGHTLY", interval: 2 });
    });

    it("handles weekly INTERVAL=1", () => {
      const res = parseRecurrenceRule("FREQ=WEEKLY");
      expect(res).toEqual({ isRecurring: true, frequency: "WEEKLY", interval: 1 });
    });

    it("handles weekly INTERVAL=3", () => {
      const res = parseRecurrenceRule("FREQ=WEEKLY;INTERVAL=3");
      expect(res).toEqual({ isRecurring: true, frequency: "WEEKLY", interval: 3 });
    });

    it("handles annually", () => {
      const res = parseRecurrenceRule("FREQ=YEARLY");
      expect(res).toEqual({ isRecurring: true, frequency: "ANNUALLY", interval: 1 });
    });

    it("handles null or empty rrule", () => {
      const res = parseRecurrenceRule(null);
      expect(res).toEqual({ isRecurring: false, frequency: "MONTHLY", interval: 1 });
    });
  });

  describe("buildRecurrenceRule", () => {
    it("builds monthly interval 1", () => {
      expect(buildRecurrenceRule("MONTHLY", 1)).toBe("FREQ=MONTHLY");
    });

    it("builds monthly interval 2", () => {
      expect(buildRecurrenceRule("MONTHLY", 2)).toBe("FREQ=MONTHLY;INTERVAL=2");
    });

    it("builds fortnightly interval 1", () => {
      expect(buildRecurrenceRule("FORTNIGHTLY", 1)).toBe("FREQ=WEEKLY;INTERVAL=2");
    });

    it("builds fortnightly interval 2", () => {
      expect(buildRecurrenceRule("FORTNIGHTLY", 2)).toBe("FREQ=WEEKLY;INTERVAL=4");
    });

    it("builds weekly interval 1", () => {
      expect(buildRecurrenceRule("WEEKLY", 1)).toBe("FREQ=WEEKLY");
    });

    it("builds weekly interval 2", () => {
      expect(buildRecurrenceRule("WEEKLY", 2)).toBe("FREQ=WEEKLY;INTERVAL=2");
    });
  });

  describe("formatScheduleSummary", () => {
    const mockFmt = (d: unknown) => String(d);

    it("formats flexible target balance bill", () => {
      expect(formatScheduleSummary({ envelopeType: "BILL", fundingMode: "TARGET_BALANCE" })).toBe("Drawdown as needed");
    });

    it("formats monthly with interval 2", () => {
      const res = formatScheduleSummary(
        { rrule: "FREQ=MONTHLY;INTERVAL=2", startDate: "2026-10-01", endDate: "2027-01-01" },
        mockFmt
      );
      expect(res).toBe("Every 2 months from 2026-10-01 to 2027-01-01");
    });

    it("formats fortnightly", () => {
      const res = formatScheduleSummary(
        { rrule: "FREQ=WEEKLY;INTERVAL=2", startDate: "2026-10-01" },
        mockFmt
      );
      expect(res).toBe("Fortnightly from 2026-10-01");
    });

    it("formats one-off", () => {
      const res = formatScheduleSummary({ startDate: "2026-10-01" }, mockFmt);
      expect(res).toBe("One-off on 2026-10-01");
    });
  });

  describe("formatRecurrenceLabel and formatRecurrenceSuffix", () => {
    it("formats standard intervals", () => {
      expect(formatRecurrenceLabel("FREQ=MONTHLY")).toBe("Monthly");
      expect(formatRecurrenceSuffix("FREQ=MONTHLY")).toBe("/mo");

      expect(formatRecurrenceLabel("FREQ=WEEKLY")).toBe("Weekly");
      expect(formatRecurrenceSuffix("FREQ=WEEKLY")).toBe("/wk");

      expect(formatRecurrenceLabel("FREQ=WEEKLY;INTERVAL=2")).toBe("Fortnightly");
      expect(formatRecurrenceSuffix("FREQ=WEEKLY;INTERVAL=2")).toBe("/fn");

      expect(formatRecurrenceLabel("FREQ=YEARLY")).toBe("Annually");
      expect(formatRecurrenceSuffix("FREQ=YEARLY")).toBe("/yr");
    });

    it("formats custom intervals and quarterly", () => {
      expect(formatRecurrenceLabel("FREQ=MONTHLY;INTERVAL=3")).toBe("Quarterly");
      expect(formatRecurrenceSuffix("FREQ=MONTHLY;INTERVAL=3")).toBe("/qtr");

      expect(formatRecurrenceLabel("FREQ=MONTHLY;INTERVAL=5")).toBe("Every 5 months");
      expect(formatRecurrenceSuffix("FREQ=MONTHLY;INTERVAL=5")).toBe(" every 5 months");

      expect(formatRecurrenceLabel("FREQ=WEEKLY;INTERVAL=5")).toBe("Every 5 weeks");
      expect(formatRecurrenceSuffix("FREQ=WEEKLY;INTERVAL=5")).toBe(" every 5 weeks");
    });
  });
});
