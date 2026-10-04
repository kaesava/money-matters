import { describe, it, expect } from "vitest";
import {
  isPaydayOrAdjustment,
  computeRecentAndFrequentPresets,
  QuickPresetItem,
} from "./quick-presets";

describe("quick-presets in @money-matters/types", () => {
  describe("isPaydayOrAdjustment", () => {
    it("detects payday, waterfall, and adjustment keywords", () => {
      expect(isPaydayOrAdjustment("Monthly Payday Allocation")).toBe(true);
      expect(isPaydayOrAdjustment("Waterfall Deficit Repair")).toBe(true);
      expect(isPaydayOrAdjustment("Balance adjustment")).toBe(true);
      expect(isPaydayOrAdjustment("Pool balance update")).toBe(true);
      expect(isPaydayOrAdjustment("Pool reconciliation")).toBe(true);
      expect(isPaydayOrAdjustment("Woolworths Groceries")).toBe(false);
      expect(isPaydayOrAdjustment(null)).toBe(false);
      expect(isPaydayOrAdjustment(undefined)).toBe(false);
    });
  });

  describe("computeRecentAndFrequentPresets", () => {
    it("extracts up to 2 unique recent and top frequent presets", () => {
      const now = Date.now();
      const items = [
        { name: "Coffee", amount: "5.00", time: now - 1000 },
        { name: "Woolies", amount: "85.00", time: now - 2000 },
        { name: "Coffee", amount: "5.00", time: now - 3000 },
        { name: "Coffee", amount: "5.00", time: now - 4000 },
        { name: "Petrol", amount: "70.00", time: now - 5000 },
        { name: "Petrol", amount: "70.00", time: now - 6000 },
        { name: "Rent", amount: "450.00", time: now - 7000 },
      ];

      const res = computeRecentAndFrequentPresets(
        items,
        (i) => i.name.toLowerCase(),
        (i): QuickPresetItem => ({ name: i.name, amount: i.amount }),
        (i) => i.time
      );

      // Recent should have the first 2 unique items: Coffee and Woolies
      expect(res.recent).toHaveLength(2);
      expect(res.recent[0]?.name).toBe("Coffee");
      expect(res.recent[1]?.name).toBe("Woolies");

      // Frequent should not duplicate recent items (so Petrol and Rent, with Petrol having higher count)
      expect(res.frequent).toHaveLength(2);
      expect(res.frequent[0]?.name).toBe("Petrol");
      expect(res.frequent[1]?.name).toBe("Rent");
    });
  });
});
