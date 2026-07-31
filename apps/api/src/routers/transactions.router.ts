import { tenantProcedure } from '../trpc/trpc.js';
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
      return await recordExpenseCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
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
    .mutation(async ({ input }) => {
      return parseBankCsv(input.csvText);
    }),

  spendingVelocity: tenantProcedure.query(async ({ ctx }) => {
    return await getSpendingVelocityQuery(ctx.tenantId!, ctx.appId!, ctx.db);
  }),
};
