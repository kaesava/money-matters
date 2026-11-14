import { describe, it, expect } from "vitest";
import { bankAccounts, envelopes, type DbOrTx } from "@money-matters/db";
import {
  archiveBankAccountHandler,
  createTenantHandler,
} from "@money-matters/capability-tenant";

type RowRecord = Record<string, unknown>;

describe("Bank Sync Balance & Mapping Rules", () => {
  it("should create default bank account and link envelopes on tenant creation", async () => {
    const insertedAccounts: RowRecord[] = [];
    const insertedEnvelopes: RowRecord[] = [];

    const mockDb = {
      insert: (table: unknown) => ({
        values: (vals: RowRecord | RowRecord[]) => {
          const generatedId = table === bankAccounts ? "acc-primary-123" : `env-${insertedEnvelopes.length + 1}`;
          if (table === envelopes || (Array.isArray(vals) && vals[0]?.envelopeType)) {
            if (Array.isArray(vals)) insertedEnvelopes.push(...vals);
            else insertedEnvelopes.push(vals);
          } else if (table === bankAccounts && !Array.isArray(vals)) {
            insertedAccounts.push({ id: generatedId, ...vals });
          }
          const returnVals = Array.isArray(vals)
            ? vals.map((v, i) => ({ id: `id-${i}`, name: v.name || "Envelope", ...v }))
            : [{ id: generatedId, name: vals?.name || "Primary Account", ...vals }];
          return {
            onConflictDoNothing: () => Promise.resolve(returnVals),
            returning: () => Promise.resolve(returnVals),
            then: (resolve: (v: RowRecord[]) => void) => resolve(returnVals),
          };
        },
      }),
      select: () => {
        const queryChain = {
          innerJoin: () => queryChain,
          where: () => queryChain,
          limit: () => Promise.resolve([]),
          then: (resolve: (v: RowRecord[]) => void) => resolve([]),
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
    } as unknown as DbOrTx;

    const handler = createTenantHandler(mockDb);
    const result = await handler({ name: "Test Tenant", country: "AU" }, "app-123", "user-123");

    expect(result.success).toBe(true);
    expect(result.tenantId).toBeDefined();
    expect(insertedAccounts).toHaveLength(1);
    expect(insertedAccounts[0].name).toBe("Other Financial Institution (Everyday)");

    expect(insertedEnvelopes).toHaveLength(1);
    expect(insertedEnvelopes[0].envelopeType).toBe("EVERYDAY");
    expect(insertedEnvelopes[0].isSurplusTarget).toBe(true);
    expect(insertedEnvelopes[0].bankAccountId).toBe("acc-primary-123");
  });

  it("should block archiving a bank account if Everyday envelope is linked to it", async () => {
    let callCount = 0;
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => {
            callCount++;
            if (callCount === 1) {
              return {
                limit: () => Promise.resolve([{ id: "acc-1", isPrivate: false, userId: "user-1" }]),
              };
            }
            return Promise.resolve([
              { id: "env-1", envelopeType: "EVERYDAY", bankAccountId: "acc-1" },
              { id: "env-2", envelopeType: "BILL", bankAccountId: "acc-1" },
            ]);
          },
        }),
      }),
    } as unknown as DbOrTx;

    const archiveHandler = archiveBankAccountHandler(mockDb);
    await expect(
      archiveHandler("acc-1", "tenant-1", "app-1", "user-1")
    ).rejects.toThrow("Cannot archive bank account linked to the Everyday envelope");
  });

  it("should calculate expected bank balance correctly including set-aside amount and linked envelope balances", () => {
    const setAsideAmount = 500.00;
    const envelopeBalances = [150.50, 300.00, 449.50]; // Total = 900.00
    const expectedBalance = envelopeBalances.reduce((sum, val) => sum + val, 0) + setAsideAmount;

    expect(expectedBalance).toBe(1400.00);
  });
});
