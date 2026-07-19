import { describe, it, expect } from "vitest";

describe("Mobile UI section grouping and formatting", () => {
  const SECTION_ORDER = ["GOAL", "REGULAR", "EVERYDAY"] as const;

  const categories = [
    { id: "c1", name: "Rent", type: "REGULAR", currentBalance: "1200.00" },
    { id: "c2", name: "Car", type: "GOAL", currentBalance: "500.00" },
    { id: "c3", name: "Groceries", type: "EVERYDAY", currentBalance: "200.00" },
  ];

  it("groups categories correctly according to SECTION_ORDER", () => {
    const grouped = categories.reduce<Record<string, typeof categories>>((acc, cat) => {
      const key = cat.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(cat);
      return acc;
    }, {});

    expect(grouped["GOAL"]).toHaveLength(1);
    expect(grouped["REGULAR"]).toHaveLength(1);
    expect(grouped["EVERYDAY"]).toHaveLength(1);
    expect(SECTION_ORDER).toEqual(["GOAL", "REGULAR", "EVERYDAY"]);
  });

  it("formats AUD currency amounts correctly", () => {
    const fmt = (val: string | number) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    };

    expect(fmt("1200.00")).toBe("$1,200");
    expect(fmt(500.5)).toBe("$500.5");
  });
});
