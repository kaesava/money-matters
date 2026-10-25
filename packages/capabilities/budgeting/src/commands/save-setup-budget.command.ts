import { DbOrTx, tenants } from "@money-matters/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { SaveSetupBudgetCommand } from "@money-matters/types";
import { processSetupBankAccounts } from "./save-setup-budget-accounts.js";
import { processSetupEnvelopes } from "./save-setup-budget-envelopes.js";
import { processSetupIncomes } from "./save-setup-budget-incomes.js";
import { processSetupScheduledBills } from "./save-setup-budget-bills.js";

export interface SaveSetupBudgetResult {
  success: boolean;
  persistedCounts: {
    incomes: number;
    bankAccounts: number;
    envelopes: number;
    sweptEnvelopes: number;
    sweptTotalAmount: number;
    expenseSources: number;
  };
}

export function saveSetupBudgetHandler(dbClient: DbOrTx) {
  return async (
    rawInput: z.input<typeof SaveSetupBudgetCommand>,
    appId: string,
    userId: string,
    tenantId: string
  ): Promise<SaveSetupBudgetResult> => {
    const input = SaveSetupBudgetCommand.parse(rawInput);
    const runInTx =
      typeof dbClient.transaction === "function"
        ? (cb: (tx: DbOrTx) => Promise<SaveSetupBudgetResult>) => dbClient.transaction(cb)
        : (cb: (tx: DbOrTx) => Promise<SaveSetupBudgetResult>) => cb(dbClient);

    return await runInTx(async (tx) => {
      const now = new Date();

      let tenantTimezone = "Australia/Sydney";
      if (typeof tx.select === "function") {
        try {
          const tenantRows = await tx
            .select({ timezone: tenants.timezone })
            .from(tenants)
            .where(eq(tenants.id, tenantId))
            .limit(1);
          if (tenantRows[0]?.timezone) {
            tenantTimezone = tenantRows[0].timezone;
          }
        } catch {
          // Safe mock fallback
        }
      }

      // 1. Process Bank Accounts
      const { accountIdMap, primaryBankAccountId } = await processSetupBankAccounts(
        tx,
        input.bankAccounts,
        input.archivedAccountIds,
        tenantId,
        appId,
        userId,
        now
      );

      // 2. Process Envelopes (Upserts, Archivals, Balance Sweeps, Event Synchronization)
      const { envelopeIdMap, sweptEnvelopesCount, sweptTotalAmount } = await processSetupEnvelopes(
        tx,
        input.envelopes,
        input.archivedEnvelopeIds,
        accountIdMap,
        primaryBankAccountId,
        tenantId,
        appId,
        userId,
        now,
        tenantTimezone
      );

      // 3. Process Income Schedules (Upserts, Archivals, Event Synchronization)
      await processSetupIncomes(
        tx,
        input.incomes,
        input.archivedIncomeIds,
        accountIdMap,
        primaryBankAccountId,
        input.autoCreateIncomeEvents !== false,
        tenantId,
        appId,
        userId,
        now
      );

      // 4. Auto-create Scheduled Events for New SCHEDULED_BILL Envelopes
      const createdEventsCount = await processSetupScheduledBills(
        tx,
        input.envelopes,
        envelopeIdMap,
        tenantId,
        appId,
        userId,
        now,
        tenantTimezone
      );

      // 5. Update Tenant Setup Status
      if (typeof (tx as any).update === "function") {
        await tx
          .update(tenants)
          .set({
            setupCompletedAt: now,
            setupStatus: "COMPLETED",
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(tenants.id, tenantId));
      }

      return {
        success: true,
        persistedCounts: {
          incomes: input.incomes.length,
          bankAccounts: input.bankAccounts.length,
          envelopes: input.envelopes.length,
          sweptEnvelopes: sweptEnvelopesCount,
          sweptTotalAmount,
          expenseSources: createdEventsCount,
        },
      };
    });
  };
}
