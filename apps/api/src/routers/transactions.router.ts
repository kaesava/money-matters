import { tenantProcedure, requiresWriteAccess, requiresPaidTier } from '../trpc/trpc.js';
import { posthog } from '../lib/posthog.js';
import { inngest } from '../inngest/client.js';
import {
  recordExpenseCommand,
  listTransactionsQuery,
  listCategoryTransactionsQuery,
  canAffordQuery,
  parseBankCsv,
  checkCsvDuplicatesQuery,
  commitCsvImportCommand,
  BankCsvImportInputSchema,
  getSpendingVelocityQuery,
} from "@money-matters/capability-transactions";
import {
  RecordExpenseCommand,
  ListTransactionsQuery,
  ListCategoryTransactionsQuery,
  CanAffordQuery,
  CommitCsvImportCommand,
} from "@money-matters/types";

export const transactionsRouter = {
  recordExpense: tenantProcedure
    .input(RecordExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await recordExpenseCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      
      // Fire-and-forget async background event to Inngest for notifications & goal milestones
      inngest.send({
        name: 'transaction/recorded',
        data: {
          categoryId: input.categoryId,
          tenantId: ctx.tenantId!,
          userId: ctx.userId!,
          amount: input.amount,
        },
      }).catch(() => {
        // Non-blocking: background event dispatch fails gracefully if Inngest is offline in dev
      });

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
      const result = parseBankCsv(input.csvText, input.customMapping);
      if (result.transactions.length > 0) {
        const keys = result.transactions.map((t) => t.idempotencyKey);
        const dupKeys = await checkCsvDuplicatesQuery(keys, ctx.tenantId!, ctx.appId!, ctx.db);
        result.transactions = result.transactions.map((t) => ({
          ...t,
          bankAccountId: input.bankAccountId,
          isDuplicate: dupKeys.has(t.idempotencyKey),
        }));
      }
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'csv_imported',
          properties: {
            tenant_id: ctx.tenantId,
            row_count: result?.transactions?.length ?? 0,
            bank_name: result?.bank,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  commitCsvImport: tenantProcedure
    .input(CommitCsvImportCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      requiresPaidTier(ctx, 'csv_import');
      const result = await commitCsvImportCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'csv_batch_imported',
          properties: {
            tenant_id: ctx.tenantId,
            imported_count: result.importedCount,
            skipped_duplicates_count: result.skippedDuplicatesCount,
            bank_account_id: input.bankAccountId,
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

