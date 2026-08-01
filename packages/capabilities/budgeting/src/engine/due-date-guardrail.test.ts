import { describe, it, expect } from "vitest";
import { evaluateBillsPoolHealth, UpcomingBill } from "./due-date-guardrail.js";

describe("Due-Date Guardrail Engine", () => {
  const futureDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split("T")[0]!;
  };

  const sampleBills: UpcomingBill[] = [
    { id: "1", name: "Rent", amount: 1000, dueDate: futureDate(3) },
    { id: "2", name: "Electricity", amount: 200, dueDate: futureDate(10) },
    { id: "3", name: "Car Insurance", amount: 800, dueDate: futureDate(25) }, // Outside 14-day window
  ];

  it("returns HEALTHY when Bills Pool balance covers upcoming 14-day bills", () => {
    const result = evaluateBillsPoolHealth({
      currentBillsPoolBalance: 1250,
      upcomingBills: sampleBills,
      lookaheadDays: 14,
    });

    expect(result.status).toBe("HEALTHY");
    expect(result.requiredAmount).toBe(1200); // 1000 + 200
    expect(result.shortfallAmount).toBe(0);
    expect(result.affectedBills).toHaveLength(2);
  });

  it("returns SHORTFALL_ALERT when Bills Pool balance is less than upcoming 14-day bills", () => {
    const result = evaluateBillsPoolHealth({
      currentBillsPoolBalance: 800,
      upcomingBills: sampleBills,
      lookaheadDays: 14,
    });

    expect(result.status).toBe("SHORTFALL_ALERT");
    expect(result.requiredAmount).toBe(1200);
    expect(result.shortfallAmount).toBe(400); // 1200 - 800
    expect(result.affectedBills).toHaveLength(2);
  });
});
