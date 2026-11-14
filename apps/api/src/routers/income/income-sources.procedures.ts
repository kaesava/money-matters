import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import {
  createIncomeSourceCommand,
  updateIncomeSourceCommand,
  listIncomeSourcesQuery,
} from "@money-matters/capability-budgeting";
import { posthog } from '../../lib/posthog.js';
import { z } from 'zod';

const IncomeInputSchema = z.object({
  name: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  receivingAccountId: z.string().uuid().optional(),
  isRecurring: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]).optional(),
  interval: z.number().min(1).max(365).optional(),
  contributionMode: z.enum(["FULL", "PERCENTAGE", "FIXED_AMOUNT"]).optional(),
  contributionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
}).strict();

export const incomeSourcesProcedures = {
  createIncomeSource: privateTenantProcedure
    .input(IncomeInputSchema)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const result = await createIncomeSourceCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
      if (input.isRecurring && posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'income_source_created',
          properties: {
            tenant_id: ctx.tenantId,
            is_recurring: input.isRecurring,
            frequency: input.frequency ?? 'MONTHLY',
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  updateIncomeSource: privateTenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: IncomeInputSchema.partial().strict(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await updateIncomeSourceCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  listIncomeSources: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listIncomeSourcesQuery(ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),
};
