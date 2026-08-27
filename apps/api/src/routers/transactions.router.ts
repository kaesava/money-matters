import { privateTenantProcedure, requiresWriteAccess, requiresPaidTier } from '../trpc/trpc.js';
import { posthog } from '../lib/posthog.js';
import { inngest } from '../inngest/client.js';
import { tenants } from "@money-matters/db";
import { eq } from "drizzle-orm";
import {
  recordExpenseCommand,
  listTransactionsQuery,
  listCategoryTransactionsQuery,
  canAffordQuery,
  parseBankCsv,
  checkCsvDuplicatesQuery,
  commitCsvImportCommand,
  rollbackCsvImportBatchCommand,
  RollbackCsvImportBatchInputSchema,
  BankCsvImportInputSchema,
  getSpendingVelocityQuery,
  listCsvImportBatchesQuery,
} from "@money-matters/capability-transactions";
import {
  RecordExpenseCommand,
  ListTransactionsQuery,
  ListCategoryTransactionsQuery,
  CanAffordQuery,
  CommitCsvImportCommand,
} from "@money-matters/types";

export const transactionsRouter = {
  recordExpense: privateTenantProcedure
    .input(RecordExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await recordExpenseCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      
      // Fire-and-forget async background event to Inngest for notifications & goal milestones
      if (inngest) {
        await inngest.send({
          name: 'transaction/recorded',
          data: {
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            categoryId: input.categoryId,
            amount: input.amount,
            note: input.note,
          },
        }).catch((err) => {
          console.error('[Inngest] Failed to dispatch transaction/recorded event:', err);
        });
      }

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'expense_recorded',
          properties: {
            tenant_id: ctx.tenantId,
            category_id: input.categoryId,
            source: input.source,
            amount: input.amount,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  listTransactions: privateTenantProcedure
    .input(ListTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await listTransactionsQuery(ctx.tenantId!, ctx.appId!, input.limit, input.offset, ctx.db, input.categoryId);
    }),

  listCategoryTransactions: privateTenantProcedure
    .input(ListCategoryTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await listCategoryTransactionsQuery(input.categoryId, ctx.tenantId!, ctx.appId!, input.limit, input.offset, ctx.db);
    }),

  canAfford: privateTenantProcedure
    .input(CanAffordQuery)
    .query(async ({ input, ctx }) => {
      const amt = parseFloat(input.amount);
      return await canAffordQuery(amt, ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  parseCsv: privateTenantProcedure
    .input(BankCsvImportInputSchema)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      requiresPaidTier(ctx, 'csv_import');
      
      const tenantRow = await ctx.db
        .select({ merchantRules: tenants.merchantRules })
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId!))
        .limit(1);

      const merchantRules = tenantRow[0]?.merchantRules || {};
      const result = parseBankCsv(input.csvText, input.customMapping, merchantRules);

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

  commitCsvImport: privateTenantProcedure
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

  rollbackCsvBatch: privateTenantProcedure
    .input(RollbackCsvImportBatchInputSchema)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      requiresPaidTier(ctx, 'csv_import');
      return await rollbackCsvImportBatchCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  spendingVelocity: privateTenantProcedure.query(async ({ ctx }) => {
    return await getSpendingVelocityQuery(ctx.tenantId!, ctx.appId!, ctx.db);
  }),

  listCsvImportBatches: privateTenantProcedure.query(async ({ ctx }) => {
    return await listCsvImportBatchesQuery(ctx.tenantId!, ctx.appId!, ctx.db);
  }),
};
