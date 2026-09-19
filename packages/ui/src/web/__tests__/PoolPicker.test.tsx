import { describe, it, expect } from "vitest";
import { PoolPicker } from "../PoolPicker";
import { formatPoolBalance, groupPoolsByType, PoolOption } from "../poolPickerUtils";

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

  describe("groupPoolsByType", () => {
    const samplePools: PoolOption[] = [
      { id: "1", name: "Everyday Spending", poolType: "EVERYDAY", currentBalance: 300 },
      { id: "2", name: "Electricity Bill", poolType: "REGULAR", currentBalance: 150 },
      { id: "3", name: "Holiday Fund", poolType: "GOAL", currentBalance: 2000 },
      { id: "4", name: "Miscellaneous", poolType: "OTHER", currentBalance: 50 },
    ];

    it("groups pools into respective categories", () => {
      const groups = groupPoolsByType(samplePools, "", false);
      expect(groups).toHaveLength(4);
      expect(groups.find((g) => g.type === "EVERYDAY")?.items).toHaveLength(1);
      expect(groups.find((g) => g.type === "REGULAR")?.items).toHaveLength(1);
      expect(groups.find((g) => g.type === "GOAL")?.items).toHaveLength(1);
      expect(groups.find((g) => g.type === "OTHER")?.items).toHaveLength(1);
    });

    it("filters pools based on search query", () => {
      const filtered = groupPoolsByType(samplePools, "holiday", false);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.type).toBe("GOAL");
      expect(filtered[0]?.items[0]?.name).toBe("Holiday Fund");
    });

    it("filters child categories when allowCategorySelection is true", () => {
      const poolsWithCategories: PoolOption[] = [
        {
          id: "p1",
          name: "Utilities",
          poolType: "REGULAR",
          categories: [
            { id: "c1", name: "Water" },
            { id: "c2", name: "Gas" },
          ],
        },
      ];

      const matchWater = groupPoolsByType(poolsWithCategories, "water", true);
      expect(matchWater).toHaveLength(1);

      const noMatch = groupPoolsByType(poolsWithCategories, "rent", true);
      expect(noMatch).toHaveLength(0);
    });
  });
});
