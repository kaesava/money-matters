import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { posthog } from '../lib/posthog.js';
import { inngest } from '../inngest/client.js';
import {
  recordExpenseCommand,
  listTransactionsQuery,
  listEnvelopeTransactionsQuery,
} from "@money-matters/capability-transactions";
import {
  RecordExpenseCommand,
  ListTransactionsQuery,
  ListEnvelopeTransactionsQuery,
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
            envelopeId: input.envelopeId,
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
            envelope_id: input.envelopeId,
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
        input.envelopeId,
        input.bankAccountId
      );
    }),

  listEnvelopeTransactions: privateTenantProcedure
    .input(ListEnvelopeTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await listEnvelopeTransactionsQuery(input.envelopeId || "", ctx.tenantId!, ctx.appId!, input.limit, input.offset, ctx.db);
    }),
};
