import { tenantProcedure, requiresWriteAccess, requiresPaidTier } from '../trpc/trpc.js';
import { posthog } from '../lib/posthog.js';
import {
  recordExpenseCommand,
  listTransactionsQuery,
  listCategoryTransactionsQuery,
  canAffordQuery,
  parseBankCsv,
  BankCsvImportInputSchema,
  getSpendingVelocityQuery,
} from "@money-matters/capability-transactions";
import {
  RecordExpenseCommand,
  ListTransactionsQuery,
  ListCategoryTransactionsQuery,
  CanAffordQuery,
} from "@money-matters/types";

export const transactionsRouter = {
  recordExpense: tenantProcedure
    .input(RecordExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await recordExpenseCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'transaction_recorded',
          properties: {
            tenant_id: ctx.tenantId,
            flow_type: input.flowType,
            source: input.source,
            amount: input.amount,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  listTransactions: tenantProcedure
    .input(ListTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await listTransactionsQuery(ctx.tenantId!, ctx.appId!, input.limit, input.offset, ctx.db, input.categoryId);
    }),

  listCategoryTransactions: tenantProcedure
    .input(ListCategoryTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await listCategoryTransactionsQuery(input.categoryId, ctx.tenantId!, ctx.appId!, input.limit, input.offset, ctx.db);
    }),

  canAfford: tenantProcedure
    .input(CanAffordQuery)
    .query(async ({ input, ctx }) => {
      const amt = parseFloat(input.amount);
      return await canAffordQuery(amt, ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  parseCsv: tenantProcedure
    .input(BankCsvImportInputSchema)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      requiresPaidTier(ctx, 'csv_import');
      const result = parseBankCsv(input.csvText);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'csv_imported',
          properties: {
            tenant_id: ctx.tenantId,
            row_count: result?.transactions?.length ?? 0,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  spendingVelocity: tenantProcedure.query(async ({ ctx }) => {
    return await getSpendingVelocityQuery(ctx.tenantId!, ctx.appId!, ctx.db);
  }),
};
