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
        reasoning: l.reasoning,
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
          createdAt: allocationPlans.createdAt,
          updatedAt: allocationPlans.updatedAt,
          incomeName: sql<string>`COALESCE(${incomeEvents.name}, ${incomeSources.name}, 'Income Deposit')`,
          receivingAccountName: bankAccounts.name,
          receivingAccountId: bankAccounts.id,
          expectedDate: incomeEvents.expectedDate,
          actualDate: incomeEvents.actualDate,
          note: incomeEvents.note,
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
          reasoning: z.string().optional(),
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

        if (!incomeEvt || incomeEvt.status !== "PENDING") {
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
              reasoning: l.reasoning || null,
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

  saveAutoAllocation: privateTenantProcedure
    .input(
      z.object({
        incomeEventId: z.string().uuid(),
        totalIncomeAmount: z.string(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const amountNum = parseFloat(input.totalIncomeAmount);
      const lines = await previewAllocationQuery(
        ctx.tenantId!,
        ctx.appId!,
        input.incomeEventId,
        amountNum,
        ctx.db
      );

      return await ctx.db.transaction(async (tx) => {
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

        if (lines.length > 0) {
          await tx.insert(allocationPlanLines).values(
            lines.map((l) => ({
              planId: plan.id,
              poolId: l.poolId,
              categoryId: null,
              proposedAmount: l.proposedAmount.toFixed(2),
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
            throw new Error("Confirmed income splits cannot be reverted.");
          }

          await tx
            .update(allocationPlans)
            .set({
              archivedAt: new Date(),
              updatedAt: new Date(),
              updatedBy: ctx.userId!,
            })
            .where(eq(allocationPlans.id, plan.id));
        }

        return { success: true };
      });
    }),

  getMatrixProjectionData: privateTenantProcedure
    .input(
      z
        .object({
          monthsAhead: z.number().optional().default(12),
        })
        .strict()
    )
    .query(async ({ input, ctx }) => {
      const { pools, categories, incomeEvents, expenseEvents, incomeSources, expenseSources, getPoolBalancesMap } = await import("@money-matters/db");
      const { computeMatrixProjection } = await import("@money-matters/capability-budgeting/engine");

      const activePools = await ctx.db
        .select()
        .from(pools)
        .where(
          and(
            eq(pools.tenantId, ctx.tenantId!),
            eq(pools.appId, ctx.appId!),
            sql`${pools.archivedAt} IS NULL`
          )
        );

      const activeCategories = await ctx.db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.tenantId, ctx.tenantId!),
            eq(categories.appId, ctx.appId!),
            sql`${categories.archivedAt} IS NULL`
          )
        );

      const balancesMap = await getPoolBalancesMap(ctx.tenantId!, ctx.appId!, ctx.db);

      const now = new Date();
      const futureDate = new Date();
      futureDate.setMonth(now.getMonth() + (input.monthsAhead || 12));

      const nowStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now);
      const futureStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(futureDate);

      const dbIncomeEvents = await ctx.db
        .select({
          id: incomeEvents.id,
          expectedDate: incomeEvents.expectedDate,
          actualDate: incomeEvents.actualDate,
          expectedAmount: incomeEvents.expectedAmount,
          actualAmount: incomeEvents.actualAmount,
          status: incomeEvents.status,
          sourceName: sql<string>`COALESCE(${incomeEvents.name}, ${incomeSources.name}, 'Income')`,
          incomeSourceId: incomeEvents.incomeSourceId,
        })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeSources.id, incomeEvents.incomeSourceId))
        .where(
          and(
            eq(incomeEvents.tenantId, ctx.tenantId!),
            eq(incomeEvents.appId, ctx.appId!),
            sql`${incomeEvents.archivedAt} IS NULL`,
            sql`${incomeEvents.expectedDate} >= ${nowStr}`,
            sql`${incomeEvents.expectedDate} <= ${futureStr}`
          )
        )
        .orderBy(incomeEvents.expectedDate);

      const dbExpenseEvents = await ctx.db
        .select({
          id: expenseEvents.id,
          categoryId: expenseEvents.categoryId,
          expectedDate: expenseEvents.expectedDate,
          actualDate: expenseEvents.actualDate,
          expectedAmount: expenseEvents.expectedAmount,
          actualAmount: expenseEvents.actualAmount,
          status: expenseEvents.status,
          name: sql<string>`COALESCE(${expenseEvents.name}, ${expenseSources.name}, 'Bill')`,
        })
        .from(expenseEvents)
        .leftJoin(expenseSources, eq(expenseSources.id, expenseEvents.expenseSourceId))
        .where(
          and(
            eq(expenseEvents.tenantId, ctx.tenantId!),
            eq(expenseEvents.appId, ctx.appId!),
            sql`${expenseEvents.archivedAt} IS NULL`,
            sql`${expenseEvents.expectedDate} >= ${nowStr}`,
            sql`${expenseEvents.expectedDate} <= ${futureStr}`
          )
        )
        .orderBy(expenseEvents.expectedDate);

      const engineBuckets = activePools.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.poolType as "EVERYDAY" | "REGULAR" | "GOAL",
        targetAmount: p.targetAmount ? parseFloat(p.targetAmount) : null,
        currentBalance: balancesMap[p.id] || 0,
        isPrivate: false,
        isSurplusTarget: Boolean(p.isSurplusTarget),
        userId: undefined,
      }));

      const matrixIncomeEvents = dbIncomeEvents.map((evt) => ({
        id: evt.id,
        expectedDate: evt.expectedDate,
        expectedAmount: parseFloat(evt.expectedAmount),
        actualAmount: evt.actualAmount ? parseFloat(evt.actualAmount) : null,
        status: evt.status as "PENDING" | "CONFIRMED",
        sourceName: evt.sourceName,
      }));

      const matrixExpenseEvents = dbExpenseEvents
        .filter((evt): evt is typeof evt & { categoryId: string } => Boolean(evt.categoryId))
        .map((evt) => ({
          id: evt.id,
          categoryId: evt.categoryId,
          amount: parseFloat(evt.actualAmount || evt.expectedAmount),
          dueDate: evt.expectedDate,
          status: evt.status as "PENDING" | "CONFIRMED",
        }));

      const projection = computeMatrixProjection({
        currentUserId: ctx.userId!,
        categories: engineBuckets,
        incomeEvents: matrixIncomeEvents,
        expenseEvents: matrixExpenseEvents,
        monthsAhead: input.monthsAhead,
      });

      return {
        projection,
        rawIncomeEvents: dbIncomeEvents,
        rawExpenseEvents: dbExpenseEvents,
        pools: activePools,
        categories: activeCategories,
      };
    }),
};

