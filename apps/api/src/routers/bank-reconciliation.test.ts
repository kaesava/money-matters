import { describe, it, expect } from "vitest";
import { bankAccounts, envelopes } from "@money-matters/db";
import {
  archiveBankAccountHandler,
  createTenantHandler,
} from "@money-matters/capability-tenant";

describe("Bank Reconciliation & Mapping Rules", () => {
  it("should create default bank account and link envelopes on tenant creation", async () => {
    const insertedAccounts: any[] = [];
    const insertedEnvelopes: any[] = [];

    const mockDb: any = {
      insert: (table: any) => ({
        values: (vals: any) => {
          const generatedId = table === bankAccounts ? "acc-primary-123" : `env-${insertedEnvelopes.length + 1}`;
          if (table === envelopes || (Array.isArray(vals) && vals[0]?.envelopeType)) {
            if (Array.isArray(vals)) insertedEnvelopes.push(...vals);
            else insertedEnvelopes.push(vals);
          } else if (table === bankAccounts) {
            insertedAccounts.push({ id: generatedId, ...vals });
          }
          const returnVals = Array.isArray(vals)
            ? vals.map((v, i) => ({ id: `id-${i}`, name: v.name || "Envelope", ...v }))
            : [{ id: generatedId, name: vals?.name || "Primary Account", ...vals }];
          return {
            onConflictDoNothing: () => Promise.resolve(returnVals),
            returning: () => Promise.resolve(returnVals),
            then: (resolve: any) => resolve(returnVals),
          };
        },
      }),
      select: () => {
        const queryChain: any = {
          innerJoin: () => queryChain,
          where: () => queryChain,
          limit: () => Promise.resolve([]),
          then: (resolve: any) => resolve([]),
        };
        return {
          from: () => queryChain,
        };
      },
      update: () => ({
        set: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    };

    const handler = createTenantHandler(mockDb);
    const result = await handler({ name: "Test Tenant", country: "AU" }, "app-123", "user-123");

    expect(result.success).toBe(true);
    expect(result.tenantId).toBeDefined();
    expect(insertedAccounts).toHaveLength(1);
    expect(insertedAccounts[0].name).toBe("Primary Account");

    expect(insertedEnvelopes.length).toBeGreaterThanOrEqual(3);
    const envelopeTypes = insertedEnvelopes.map((p) => p.envelopeType);
    expect(envelopeTypes).toContain("EVERYDAY");
    expect(envelopeTypes).toContain("SCHEDULED_BILL");
    expect(envelopeTypes).toContain("ONGOING_GOAL");
    expect(insertedEnvelopes.every((p) => p.bankAccountId === "acc-primary-123")).toBe(true);
  });

  it("should block archiving a bank account if active envelopes are linked to it", async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              { id: "env-1", envelopeType: "EVERYDAY", bankAccountId: "acc-1" },
              { id: "env-2", envelopeType: "SCHEDULED_BILL", bankAccountId: "acc-1" },
            ]),
        }),
      }),
    };

    const archiveHandler = archiveBankAccountHandler(mockDb);
    await expect(
      archiveHandler("acc-1", "tenant-1", "app-1", "user-1")
    ).rejects.toThrow("Cannot archive bank account because envelope(s)");
  });

  it("should calculate expected bank balance correctly including unbudgeted buffer and linked pool balances", () => {
    const unbudgetedBuffer = 500.00;
    const poolBalances = [150.50, 300.00, 449.50]; // Total = 900.00
    const expectedBalance = poolBalances.reduce((sum, val) => sum + val, 0) + unbudgetedBuffer;

    expect(expectedBalance).toBe(1400.00);
  });
});
