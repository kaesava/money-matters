import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { posthog } from '../lib/posthog.js';
import {
  recordExpenseCommand,
  listTransactionsQuery,
  searchTransactionsQuery,
  listEnvelopeTransactionsQuery,
  getSpendingAnalyticsQuery,
} from "@money-matters/capability-transactions";
import {
  RecordExpenseCommand,
  ListTransactionsQuery,
  SearchTransactionsQuery,
  ListEnvelopeTransactionsQuery,
  GetSpendingAnalyticsQuery,
  DEFAULT_APP_FEATURE_FLAGS,
} from "@money-matters/types";
import { apps } from "@money-matters/db";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const transactionsRouter = {
  recordExpense: privateTenantProcedure
    .input(RecordExpenseCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await recordExpenseCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'expense_recorded',
          properties: {
            tenant_id: ctx.tenantId,
            envelope_id: input.envelopeId,
            source: input.source,
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
        input.bankAccountId,
        ctx.userId!
      );
    }),

  searchTransactions: privateTenantProcedure
    .input(SearchTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await searchTransactionsQuery(
        ctx.tenantId!,
        ctx.appId!,
        input.query,
        input.limit,
        ctx.db,
        input.envelopeId,
        input.bankAccountId,
        ctx.userId!
      );
    }),

  listEnvelopeTransactions: privateTenantProcedure
    .input(ListEnvelopeTransactionsQuery)
    .query(async ({ input, ctx }) => {
      return await listEnvelopeTransactionsQuery(
        input.envelopeId || "",
        ctx.tenantId!,
        ctx.appId!,
        input.limit,
        input.offset,
        ctx.db,
        ctx.userId!
      );
    }),

  getSpendingAnalytics: privateTenantProcedure
    .input(GetSpendingAnalyticsQuery)
    .query(async ({ input, ctx }) => {
      const [appRecord] = await ctx.db
        .select({ featureFlags: apps.featureFlags })
        .from(apps)
        .where(eq(apps.id, ctx.appId!))
        .limit(1);

      const flags = appRecord?.featureFlags || DEFAULT_APP_FEATURE_FLAGS;
      if (!flags.reports) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Reports feature is disabled for this application.',
        });
      }

      return await getSpendingAnalyticsQuery(
        ctx.tenantId!,
        ctx.appId!,
        input,
        ctx.db,
        new Date(),
        ctx.userId!
      );
    }),
};
