import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { posthog } from '../lib/posthog.js';
import { inngest } from '../inngest/client.js';
import {
  recordExpenseCommand,
  listTransactionsQuery,
  listCategoryTransactionsQuery,
} from "@money-matters/capability-transactions";
import {
  RecordExpenseCommand,
  ListTransactionsQuery,
  ListCategoryTransactionsQuery,
} from "@money-matters/types";

export const transactionsRouter = {
  recordExpense: privateTenantProcedure
    .input(RecordExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await recordExpenseCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      
      if (inngest) {
        await inngest.send({
          name: 'transaction/recorded',
          data: {
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            poolId: input.poolId,
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
            pool_id: input.poolId,
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
      return await listTransactionsQuery(
        ctx.tenantId!,
        ctx.appId!,
        input.limit,
        input.offset,
        ctx.db,
        input.categoryId,
        input.poolId,
        input.bankAccountId
      );
    }),

  listCategoryTransactions: privateTenantProcedure
    .input(ListCategoryTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await listCategoryTransactionsQuery(input.categoryId || "", ctx.tenantId!, ctx.appId!, input.limit, input.offset, ctx.db);
    }),
};
