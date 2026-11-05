import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import {
  allocationPlans,
  allocationPlanLines,
  envelopes,
  incomeEvents,
  expenseEvents,
  incomeSources,
  tenants,
  getEnvelopeBalancesMap,
} from "@money-matters/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import {
  previewAllocationQuery,
  overrideEventCommand,
  bulkDeleteEventsCommand,
  deleteUpcomingEventCommand,
} from "@money-matters/capability-budgeting";
import { computeMatrixProjection, mapEnvelopeToEngineBucket } from "@money-matters/capability-budgeting/engine";
import {
  OverrideEventCommand,
  DeleteUpcomingEventCommand,
  BulkDeleteEventsCommand,
} from "@money-matters/types";
import { getTenantDateString } from "@money-matters/core";
import { z } from 'zod';

export const paydayMatrixProcedures = {
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

  saveBulkAllocations: privateTenantProcedure
    .input(
      z.object({
        incomeEventId: z.string().uuid(),
        totalIncomeAmount: z.string(),
        lines: z.array(z.object({
          envelopeId: z.string().uuid().optional(),
          poolId: z.string().uuid().optional(),
          proposedAmount: z.string(),
          reasoning: z.string().optional(),
        }).strict()),
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
              envelopeId: (l.envelopeId || l.poolId)!,
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
      const allocationResult = await previewAllocationQuery(
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

        if (allocationResult.lines.length > 0) {
          await tx.insert(allocationPlanLines).values(
            allocationResult.lines.map((l) => ({
              planId: plan.id,
              envelopeId: l.bucketId,
              proposedAmount: l.proposedAmount.toFixed(2),
              reasoning: l.reasoning,
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

  getMatrixProjectionData: privateTenantProcedure
    .input(
      z
        .object({
          monthsAhead: z.number().optional().default(12),
        })
        .strict()
    )
    .query(async ({ input, ctx }) => {
      const activeEnvelopes = await ctx.db
        .select()
        .from(envelopes)
        .where(
          and(
            eq(envelopes.tenantId, ctx.tenantId!),
            eq(envelopes.appId, ctx.appId!),
            sql`${envelopes.archivedAt} IS NULL`
          )
        );

      const [tenantRecord] = await ctx.db
        .select({ timezone: tenants.timezone })
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId!))
        .limit(1);
      const tenantTz = tenantRecord?.timezone || "Australia/Sydney";

      const balancesMap = await getEnvelopeBalancesMap(ctx.tenantId!, ctx.appId!, ctx.db);

      const now = new Date();
      const futureDate = new Date();
      futureDate.setMonth(now.getMonth() + (input.monthsAhead || 12));

      const nowStr = getTenantDateString(now, { timezone: tenantTz });
      const futureStr = getTenantDateString(futureDate, { timezone: tenantTz });

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
          envelopeId: expenseEvents.envelopeId,
          expectedDate: expenseEvents.expectedDate,
          actualDate: expenseEvents.actualDate,
          expectedAmount: expenseEvents.expectedAmount,
          actualAmount: expenseEvents.actualAmount,
          status: expenseEvents.status,
          name: expenseEvents.name,
        })
        .from(expenseEvents)
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

      const engineBuckets = activeEnvelopes.map((p) =>
        mapEnvelopeToEngineBucket(p, balancesMap[p.id] || 0)
      );

      const matrixIncomeEvents = dbIncomeEvents.map((evt) => ({
        id: evt.id,
        expectedDate: evt.expectedDate,
        expectedAmount: parseFloat(evt.expectedAmount),
        actualAmount: evt.actualAmount ? parseFloat(evt.actualAmount) : null,
        status: evt.status as "PENDING" | "CONFIRMED",
        sourceName: evt.sourceName,
      }));

      const matrixExpenseEvents = dbExpenseEvents
        .filter((evt): evt is typeof evt & { envelopeId: string } => Boolean(evt.envelopeId))
        .map((evt) => ({
          id: evt.id,
          envelopeId: evt.envelopeId,
          categoryId: evt.envelopeId,
          amount: parseFloat(evt.actualAmount || evt.expectedAmount),
          dueDate: evt.expectedDate,
          status: evt.status as "PENDING" | "CONFIRMED",
        }));

      const planRows = await ctx.db
        .select({
          id: allocationPlans.id,
          incomeEventId: allocationPlans.incomeEventId,
          status: allocationPlans.status,
        })
        .from(allocationPlans)
        .where(
          and(
            eq(allocationPlans.tenantId, ctx.tenantId!),
            eq(allocationPlans.appId, ctx.appId!),
            sql`${allocationPlans.archivedAt} IS NULL`
          )
        );

      const planIds = planRows.map((p) => p.id);
      const cellOverrides: Record<string, number> = {};
      if (planIds.length > 0) {
        const lineRows = await ctx.db
          .select({
            planId: allocationPlanLines.planId,
            envelopeId: allocationPlanLines.envelopeId,
            proposedAmount: allocationPlanLines.proposedAmount,
            confirmedAmount: allocationPlanLines.confirmedAmount,
          })
          .from(allocationPlanLines)
          .where(inArray(allocationPlanLines.planId, planIds));

        const planMap = new Map(planRows.map((p) => [p.id, p]));
        for (const line of lineRows) {
          const plan = planMap.get(line.planId);
          if (plan) {
            const amount = parseFloat(line.confirmedAmount || line.proposedAmount || "0");
            cellOverrides[`${plan.incomeEventId}_${line.envelopeId}`] = amount;
          }
        }
      }

      const projection = computeMatrixProjection({
        currentUserId: ctx.userId!,
        categories: engineBuckets,
        incomeEvents: matrixIncomeEvents,
        expenseEvents: matrixExpenseEvents,
        cellOverrides,
        monthsAhead: input.monthsAhead,
        timezone: tenantTz,
      });

      return {
        projection,
        rawIncomeEvents: dbIncomeEvents,
        rawExpenseEvents: dbExpenseEvents,
        envelopes: activeEnvelopes,
        pools: activeEnvelopes,
        categories: [],
      };
    }),
};
