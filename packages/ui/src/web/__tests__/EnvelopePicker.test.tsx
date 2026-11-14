import { describe, it, expect } from "vitest";
import { PoolPicker } from "../EnvelopePicker";
import { formatPoolBalance, filterPools, getEnvelopeBadgeInfo, PoolOption } from "../envelopePickerUtils";

describe("PoolPicker", () => {
  it("is exported and defined as a React component", () => {
    expect(PoolPicker).toBeDefined();
    expect(typeof PoolPicker).toBe("function");
  });

  describe("formatPoolBalance", () => {
    it("formats standard numbers to Australian currency", () => {
      expect(formatPoolBalance(1234.5)).toBe("$1,234.50");
      expect(formatPoolBalance(0)).toBe("$0.00");
      expect(formatPoolBalance("500")).toBe("$500.00");
    });

    it("returns null for null, undefined, or empty values", () => {
      expect(formatPoolBalance(null)).toBeNull();
      expect(formatPoolBalance(undefined)).toBeNull();
      expect(formatPoolBalance("")).toBeNull();
      expect(formatPoolBalance("invalid")).toBeNull();
    });
  });

  describe("getEnvelopeBadgeInfo", () => {
    it("maps all envelope types to their respective labels and tagKeys", () => {
      expect(getEnvelopeBadgeInfo({ envelopeType: "BILL", fundingMode: "RECURRING" })).toEqual({
        label: "Recurring",
        tagKey: "BILL",
      });
      expect(getEnvelopeBadgeInfo({ envelopeType: "BILL", fundingMode: "TARGET_BALANCE" })).toEqual({
        label: "Target Balance",
        tagKey: "BILL",
      });
      expect(getEnvelopeBadgeInfo({ envelopeType: "GOAL", fundingMode: "TARGET_BALANCE" })).toEqual({
        label: "Target Balance",
        tagKey: "GOAL",
      });
      expect(getEnvelopeBadgeInfo({ envelopeType: "GOAL", fundingMode: "RECURRING" })).toEqual({
        label: "Recurring",
        tagKey: "GOAL",
      });
      expect(getEnvelopeBadgeInfo({ envelopeType: "EVERYDAY" })).toEqual({
        label: "Everyday",
        tagKey: "EVERYDAY",
      });
    });
  });

  describe("filterPools", () => {
    const samplePools: PoolOption[] = [
      { id: "1", name: "Everyday Spending", envelopeType: "EVERYDAY", currentBalance: 300 },
      { id: "2", name: "Electricity Bill", envelopeType: "BILL", fundingMode: "RECURRING", currentBalance: 150 },
      { id: "3", name: "Holiday Fund", envelopeType: "GOAL", fundingMode: "TARGET_BALANCE", currentBalance: 2000 },
      { id: "4", name: "Vet Visits", envelopeType: "BILL", fundingMode: "TARGET_BALANCE", currentBalance: 50 },
    ];

    it("returns all pools when query is empty", () => {
      const result = filterPools(samplePools, "", false);
      expect(result).toHaveLength(4);
    });

    it("filters pools based on search query matching name or badge", () => {
      const filteredByName = filterPools(samplePools, "holiday", false);
      expect(filteredByName).toHaveLength(1);
      expect(filteredByName[0]?.name).toBe("Holiday Fund");

      const filteredByBadge = filterPools(samplePools, "target balance", false);
      expect(filteredByBadge).toHaveLength(2);
      expect(filteredByBadge.map((p) => p.name)).toEqual(["Holiday Fund", "Vet Visits"]);
    });

    it("filters child categories when allowCategorySelection is true", () => {
      const poolsWithCategories: PoolOption[] = [
        {
          id: "p1",
          name: "Utilities",
          envelopeType: "BILL",
          fundingMode: "RECURRING",
          categories: [
            { id: "c1", name: "Water" },
            { id: "c2", name: "Gas" },
          ],
        },
      ];

      const matchWater = filterPools(poolsWithCategories, "water", true);
      expect(matchWater).toHaveLength(1);

      const noMatch = filterPools(poolsWithCategories, "rent", true);
      expect(noMatch).toHaveLength(0);
    });
  });
});
