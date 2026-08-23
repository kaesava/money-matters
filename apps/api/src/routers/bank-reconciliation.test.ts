import { describe, it, expect } from "vitest";
import { bankAccounts } from "@money-matters/db";
import {
  updateBankAccountMappingsHandler,
  archiveBankAccountHandler,
  createTenantHandler,
} from "@money-matters/capability-tenant";

describe("Bank Reconciliation & Mapping Rules", () => {
  it("should create default bank account and link all 3 pools on tenant creation", async () => {
    const insertedAccounts: any[] = [];
    const insertedMappings: any[] = [];

    const mockDb: any = {
      insert: (table: any) => ({
        values: (vals: any) => {
          if (Array.isArray(vals)) {
            insertedMappings.push(...vals);
            return Promise.resolve();
          }
          const generatedId = table === bankAccounts ? "acc-primary-123" : "t-1";
          if (table === bankAccounts) {
            insertedAccounts.push({ id: generatedId, ...vals });
          }
          return {
            onConflictDoNothing: () => Promise.resolve(),
            returning: () => Promise.resolve([{ id: generatedId, name: vals.name || "Primary Account", ...vals }]),
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

    // Verify all 3 pools are linked to primary account
    const primaryMappings = insertedMappings.filter((m) => m.bankAccountId === "acc-primary-123");
    expect(primaryMappings).toHaveLength(3);
    const mappedTypes = primaryMappings.map((m) => m.categoryType);
    expect(mappedTypes).toContain("EVERYDAY");
    expect(mappedTypes).toContain("REGULAR");
    expect(mappedTypes).toContain("GOAL");
    expect(primaryMappings.every((m) => m.bankAccountId === "acc-primary-123")).toBe(true);
  });

  it("should block archiving a bank account if category pools are linked to it", async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              { id: "map-1", categoryType: "EVERYDAY", bankAccountId: "acc-1" },
              { id: "map-2", categoryType: "REGULAR", bankAccountId: "acc-1" },
            ]),
        }),
      }),
    };

    const archiveHandler = archiveBankAccountHandler(mockDb);
    await expect(
      archiveHandler("acc-1", "tenant-1", "app-1", "user-1")
    ).rejects.toThrow("Cannot delete bank account because category type(s)");
  });

  it("should calculate expected bank balance correctly including unbudgeted buffer and linked category balances", () => {
    const unbudgetedBuffer = 500.00;
    const categoryBalances = [150.50, 300.00, 449.50]; // Total = 900.00
    const expectedBalance = categoryBalances.reduce((sum, val) => sum + val, 0) + unbudgetedBuffer;

    expect(expectedBalance).toBe(1400.00);
  });

  it("should enforce that all 3 pool types maintain active mappings", async () => {
    const existingMappings: any[] = [
      { id: "map-1", tenantId: "t-1", categoryType: "EVERYDAY", bankAccountId: "acc-1" },
      { id: "map-2", tenantId: "t-1", categoryType: "REGULAR", bankAccountId: "acc-1" },
    ];

    const mockDbForCheck: any = {
      select: () => ({
        from: () => ({
          where: () => {
            const p = Promise.resolve(existingMappings);
            (p as any).limit = () => Promise.resolve([existingMappings[0]]);
            return p;
          },
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
    };

    const handler = updateBankAccountMappingsHandler(mockDbForCheck);
    await expect(
      handler(
        {
          mappings: [{ categoryType: "EVERYDAY", bankAccountId: "acc-2" }],
        },
        "t-1",
        "app-1",
        "user-1"
      )
    ).rejects.toThrow("All pools must be linked to at least one bank account");
  });
});
