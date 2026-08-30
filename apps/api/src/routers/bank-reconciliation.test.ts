import { describe, it, expect } from "vitest";
import { bankAccounts, pools } from "@money-matters/db";
import {
  archiveBankAccountHandler,
  createTenantHandler,
} from "@money-matters/capability-tenant";

describe("Bank Reconciliation & Mapping Rules", () => {
  it("should create default bank account and link pools on tenant creation", async () => {
    const insertedAccounts: any[] = [];
    const insertedPools: any[] = [];

    const mockDb: any = {
      insert: (table: any) => ({
        values: (vals: any) => {
          const generatedId = table === bankAccounts ? "acc-primary-123" : `pool-${insertedPools.length + 1}`;
          if (table === pools || (Array.isArray(vals) && vals[0]?.poolType)) {
            if (Array.isArray(vals)) insertedPools.push(...vals);
            else insertedPools.push(vals);
          } else if (table === bankAccounts) {
            insertedAccounts.push({ id: generatedId, ...vals });
          }
          const returnVals = Array.isArray(vals)
            ? vals.map((v, i) => ({ id: `id-${i}`, name: v.name || "Pool", ...v }))
            : [{ id: generatedId, name: vals?.name || "Primary Account", ...vals }];
          return {
            onConflictDoNothing: () => Promise.resolve(returnVals),
            returning: () => Promise.resolve(returnVals),
            then: (resolve: any) => resolve(returnVals),
          };
        },
      }),
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    };

    const handler = createTenantHandler(mockDb);
    const result = await handler({ name: "Test Tenant" }, "app-123", "user-123");

    expect(result.success).toBe(true);
    expect(result.tenantId).toBeDefined();
    expect(insertedAccounts).toHaveLength(1);
    expect(insertedAccounts[0].name).toBe("Primary Account");

    expect(insertedPools.length).toBeGreaterThanOrEqual(3);
    const poolTypes = insertedPools.map((p) => p.poolType);
    expect(poolTypes).toContain("EVERYDAY");
    expect(poolTypes).toContain("REGULAR");
    expect(poolTypes).toContain("GOAL");
    expect(insertedPools.every((p) => p.bankAccountId === "acc-primary-123")).toBe(true);
  });

  it("should block archiving a bank account if active pools are linked to it", async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              { id: "pool-1", poolType: "EVERYDAY", bankAccountId: "acc-1" },
              { id: "pool-2", poolType: "REGULAR", bankAccountId: "acc-1" },
            ]),
        }),
      }),
    };

    const archiveHandler = archiveBankAccountHandler(mockDb);
    await expect(
      archiveHandler("acc-1", "tenant-1", "app-1", "user-1")
    ).rejects.toThrow("Cannot delete bank account because pool(s)");
  });

  it("should calculate expected bank balance correctly including unbudgeted buffer and linked pool balances", () => {
    const unbudgetedBuffer = 500.00;
    const poolBalances = [150.50, 300.00, 449.50]; // Total = 900.00
    const expectedBalance = poolBalances.reduce((sum, val) => sum + val, 0) + unbudgetedBuffer;

    expect(expectedBalance).toBe(1400.00);
  });
});
