import { privateTenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { allocationPlans, allocationPlanLines, categories, pools, incomeEvents, transactionLedger } from "@money-matters/db";
import { and, eq, sql, desc, inArray } from "drizzle-orm";
import { posthog } from '../lib/posthog.js';
import {
  runAllocationCommand,
  confirmAllocationCommand,
  previewAllocationQuery,
  previewPaydayQuery,
  overrideEventCommand,
  bulkDeleteEventsCommand,
  deleteUpcomingEventCommand,
  ConfirmAllocationInput,
} from "@money-matters/capability-budgeting";
import {
  OverrideEventCommand,
  DeleteUpcomingEventCommand,
  BulkDeleteEventsCommand,
  ConfirmPaydayCommand,
} from "@money-matters/types";
import { z } from 'zod';

export const paydayRouter = {
  previewPayday: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .query(async ({ input, ctx }) => {
      return await previewPaydayQuery(input.incomeEventId, ctx.tenantId!, ctx.appId!, ctx.db);
    }),

  confirmPayday: privateTenantProcedure
    .input(ConfirmPaydayCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const customLines = input.lines?.map((l) => ({
        bucketId: l.poolId,
        amount: l.amount,
      }));

      const result = await runAllocationCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.incomeEventId,
        parseFloat(input.actualAmount),
        ctx.db,
        customLines,
        input.markAsReceivedToday
      );
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'payday_confirmed',
          properties: {
            tenant_id: ctx.tenantId,
            income_event_id: input.incomeEventId,
            actual_amount: input.actualAmount,
            allocation_line_count: input.lines?.length ?? 0,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  overrideEvent: privateTenantProcedure
    .input(OverrideEventCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await overrideEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  deleteUpcomingEvent: privateTenantProcedure
    .input(DeleteUpcomingEventCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await deleteUpcomingEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  bulkDeleteEvents: privateTenantProcedure
    .input(BulkDeleteEventsCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await bulkDeleteEventsCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  listAllocationPlan: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .query(async ({ input, ctx }) => {
      const [plan] = await ctx.db
        .select()
        .from(allocationPlans)
        .where(
          and(
            eq(allocationPlans.incomeEventId, input.incomeEventId),
            eq(allocationPlans.tenantId, ctx.tenantId!),
            eq(allocationPlans.appId, ctx.appId!),
            sql`${allocationPlans.archivedAt} IS NULL`
          )
        )
        .orderBy(desc(allocationPlans.createdAt))
        .limit(1);

      if (!plan) return null;

      const lines = await ctx.db
        .select({
          id: allocationPlanLines.id,
          poolId: allocationPlanLines.poolId,
          categoryId: allocationPlanLines.categoryId,
          proposedAmount: allocationPlanLines.proposedAmount,
          confirmedAmount: allocationPlanLines.confirmedAmount,
          reasoning: allocationPlanLines.reasoning,
          poolName: pools.name,
          categoryName: categories.name,
        })
        .from(allocationPlanLines)
        .leftJoin(pools, eq(pools.id, allocationPlanLines.poolId))
        .leftJoin(categories, eq(categories.id, allocationPlanLines.categoryId))
        .where(eq(allocationPlanLines.planId, plan.id));

      return {
        ...plan,
        lines: lines.map(l => ({ ...l, poolName: l.poolName ?? "Unknown Pool" })),
      };
    }),

  listAllAllocationPlans: privateTenantProcedure
    .query(async ({ ctx }) => {
      const { incomeEvents, incomeSources, bankAccounts } = await import("@money-matters/db");
      
      const plans = await ctx.db
        .select({
          id: allocationPlans.id,
          tenantId: allocationPlans.tenantId,
          appId: allocationPlans.appId,
          incomeEventId: allocationPlans.incomeEventId,
          totalIncomeAmount: allocationPlans.totalIncomeAmount,
          status: allocationPlans.status,
          isManual: allocationPlans.isManual,
          createdAt: allocationPlans.createdAt,
          updatedAt: allocationPlans.updatedAt,
          incomeName: sql<string>`COALESCE(${incomeEvents.name}, ${incomeSources.name}, 'Income Deposit')`,
          receivingAccountName: bankAccounts.name,
          expectedDate: incomeEvents.expectedDate,
        })
        .from(allocationPlans)
        .leftJoin(incomeEvents, eq(incomeEvents.id, allocationPlans.incomeEventId))
        .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
        .leftJoin(bankAccounts, eq(bankAccounts.id, incomeSources.receivingAccountId))
        .where(
          and(
            eq(allocationPlans.tenantId, ctx.tenantId!),
            eq(allocationPlans.appId, ctx.appId!),
            sql`${allocationPlans.archivedAt} IS NULL`
          )
        )
        .orderBy(desc(allocationPlans.createdAt))
        .limit(50);

      const planIds = plans.map(p => p.id);
      let lines: Array<{ planId: string; poolId: string; categoryId: string | null; proposedAmount: string; confirmedAmount: string | null; reasoning: string | null; poolName: string | null }> = [];
      if (planIds.length > 0) {
        lines = await ctx.db
          .select({
            planId: allocationPlanLines.planId,
            poolId: allocationPlanLines.poolId,
            categoryId: allocationPlanLines.categoryId,
            proposedAmount: allocationPlanLines.proposedAmount,
            confirmedAmount: allocationPlanLines.confirmedAmount,
            reasoning: allocationPlanLines.reasoning,
            poolName: pools.name,
          })
          .from(allocationPlanLines)
          .leftJoin(pools, eq(pools.id, allocationPlanLines.poolId))
          .where(inArray(allocationPlanLines.planId, planIds));
      }

      return plans.map((plan) => ({
        ...plan,
        isAutoTrigger: !plan.isManual,
        lines: lines.filter((l) => l.planId === plan.id),
      }));
    }),


  runAllocation: privateTenantProcedure
    .input(
      z.object({
        incomeAmount: z.number().positive(),
        incomeEventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await runAllocationCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.incomeEventId,
        input.incomeAmount,
        ctx.db
      );
    }),

  previewAllocation: privateTenantProcedure
    .input(
      z.object({
        incomeEventId: z.string().uuid(),
        incomeAmount: z.number().positive(),
      }).strict()
    )
    .query(async ({ input, ctx }) => {
      return await previewAllocationQuery(
        ctx.tenantId!,
        ctx.appId!,
        input.incomeEventId,
        input.incomeAmount,
        ctx.db
      );
    }),

  confirmAllocation: privateTenantProcedure
    .input(ConfirmAllocationInput)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await confirmAllocationCommand(
        input,
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        ctx.db
      );
    }),

  saveBulkAllocations: privateTenantProcedure
    .input(
      z.object({
        incomeEventId: z.string().uuid(),
        totalIncomeAmount: z.string(),
        lines: z.array(z.object({
          poolId: z.string().uuid(),
          categoryId: z.string().uuid().optional(),
          proposedAmount: z.string(),
        })),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      
      return await ctx.db.transaction(async (tx) => {
        const [incomeEvt] = await tx
          .select()
          .from(incomeEvents)
          .where(
            and(
              eq(incomeEvents.id, input.incomeEventId),
              eq(incomeEvents.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);

        if (!incomeEvt || incomeEvt.status !== "UPCOMING") {
          throw new Error("Cannot save allocations for a payday that is no longer upcoming or has been processed.");
        }

        let [plan] = await tx
          .select()
          .from(allocationPlans)
          .where(
            and(
              eq(allocationPlans.incomeEventId, input.incomeEventId),
              eq(allocationPlans.status, "PENDING")
            )
          )
          .limit(1);
          
        if (!plan) {
          const [newPlan] = await tx
            .insert(allocationPlans)
            .values({
              incomeEventId: input.incomeEventId,
              totalIncomeAmount: input.totalIncomeAmount,
              status: "PENDING",
              tenantId: ctx.tenantId!,
              appId: ctx.appId!,
              createdBy: ctx.userId!,
              updatedBy: ctx.userId!,
            })
            .returning();
          plan = newPlan;
        } else {
          await tx
            .update(allocationPlans)
            .set({ totalIncomeAmount: input.totalIncomeAmount, updatedAt: new Date(), updatedBy: ctx.userId! })
            .where(eq(allocationPlans.id, plan.id));
        }

        await tx.delete(allocationPlanLines).where(eq(allocationPlanLines.planId, plan.id));

        if (input.lines.length > 0) {
          await tx.insert(allocationPlanLines).values(
            input.lines.map((l) => ({
              planId: plan.id,
              poolId: l.poolId,
              categoryId: l.categoryId || null,
              proposedAmount: l.proposedAmount,
              tenantId: ctx.tenantId!,
              appId: ctx.appId!,
              createdBy: ctx.userId!,
              updatedBy: ctx.userId!,
            }))
          );
        }
        
        return { success: true, planId: plan.id };
      });
    }),

  revertAllocationPlan: privateTenantProcedure
    .input(
      z.object({
        incomeEventId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      return await ctx.db.transaction(async (tx) => {
        const [plan] = await tx
          .select()
          .from(allocationPlans)
          .where(
            and(
              eq(allocationPlans.incomeEventId, input.incomeEventId),
              eq(allocationPlans.tenantId, ctx.tenantId!)
            )
          )
          .limit(1);

        if (plan) {
          if (plan.status === "CONFIRMED") {
            const lines = await tx
              .select()
              .from(allocationPlanLines)
              .where(eq(allocationPlanLines.planId, plan.id));

            const reversalEntries = lines
              .filter((l) => l.confirmedAmount && parseFloat(l.confirmedAmount) > 0)
              .map((l) => ({
                tenantId: ctx.tenantId!,
                appId: ctx.appId!,
                poolId: l.poolId,
                categoryId: l.categoryId,
                flowType: "DEBIT" as const,
                amount: l.confirmedAmount!,
                idempotencyKey: `revert-${l.id}`,
                note: `Payday Revert: ${l.reasoning || "Confirmed Allocation Reversal"}`,
                source: "MANUAL" as const,
                createdBy: ctx.userId!,
                updatedBy: ctx.userId!,
              }));

            if (reversalEntries.length > 0) {
              await tx.insert(transactionLedger).values(reversalEntries);
            }

            await tx
              .update(incomeEvents)
              .set({
                status: "UPCOMING",
                actualAmount: null,
                updatedBy: ctx.userId!,
                updatedAt: new Date(),
              })
              .where(eq(incomeEvents.id, input.incomeEventId));
          }

          await tx
            .delete(allocationPlans)
            .where(eq(allocationPlans.id, plan.id));
        }

        return { success: true };
      });
    }),
};

