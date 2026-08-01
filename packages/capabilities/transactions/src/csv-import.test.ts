import { describe, it, expect } from "vitest";
import { parseBankCsv } from "./csv-import";

describe("Bank CSV Parser & Auto-Categorization Engine", () => {
  it("parses CBA single-amount CSV format correctly", () => {
    const csv = `Date,Amount,Description,Balance
01/08/2026,-270.50,WOOLWORTHS BONDI JUNCTION NSW,5230.10
02/08/2026,3500.00,SALARY DEPOSIT ACME CORP,8730.10`;

    const result = parseBankCsv(csv);
    expect(result.bank).toBe("Commonwealth Bank (CBA)");
    expect(result.transactions).toHaveLength(2);
    
    expect(result.transactions[0].date).toBe("2026-08-01");
    expect(result.transactions[0].amount).toBe("270.50");
    expect(result.transactions[0].flowType).toBe("DEBIT");
    expect(result.transactions[0].suggestedCategoryName).toBe("Groceries & Food Supplies");

    expect(result.transactions[1].date).toBe("2026-08-02");
    expect(result.transactions[1].amount).toBe("3500.00");
    expect(result.transactions[1].flowType).toBe("CREDIT");
  });

  it("parses Westpac 5-column CSV format correctly", () => {
    const csv = `Bank Account,Date,Narrative,Debit Amount,Credit Amount,Balance
123456,01/08/2026,AGL ELECTRICITY PAYMENT,145.20,,4000.00
123456,02/08/2026,PARTNER TRANSFER,,500.00,4500.00`;

    const result = parseBankCsv(csv);
    expect(result.bank).toBe("Westpac");
    expect(result.transactions).toHaveLength(2);

    expect(result.transactions[0].amount).toBe("145.20");
    expect(result.transactions[0].flowType).toBe("DEBIT");
    expect(result.transactions[0].suggestedCategoryName).toBe("Electricity & Gas (AGL)");

    expect(result.transactions[1].amount).toBe("500.00");
    expect(result.transactions[1].flowType).toBe("CREDIT");
  });

  it("generates deterministic idempotency keys for transaction deduplication", () => {
    const csv = `Date,Amount,Description\n01/08/2026,-50.00,NETFLIX.COM`;
    const res1 = parseBankCsv(csv);
    const res2 = parseBankCsv(csv);

    expect(res1.transactions[0].idempotencyKey).toBe(res2.transactions[0].idempotencyKey);
    expect(res1.transactions[0].idempotencyKey).toContain("csv-import-2026-08-01-DEBIT-50.00");
  });
});
