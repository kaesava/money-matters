import { z } from "zod";
import { categories, categorySchedules, incomeSources, incomeSourceSchedules, incomeEvents, transactionLedger, shortfallEvents } from "@money-matters/db";
import { 
  CreateCategoryCommand, 
  UpdateCategoryCommand,
  CreateCategoryScheduleCommand,
  CreateIncomeSourceCommand,
  CreateIncomeSourceScheduleCommand,
  CreateIncomeEventCommand,
  RecordExpenseCommand,
  ResolveShortfallCommand
} from "@money-matters/types";
import { eq, and, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

export function createCategoryHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: z.infer<typeof CreateCategoryCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [category] = await db
      .insert(categories)
      .values({
        householdId: tenantId,
        name: input.name,
        type: input.type,
        priorityRank: input.priorityRank || null,
        isDefaultExcess: input.isDefaultExcess,
        icon: input.icon || null,
        colour: input.colour || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return category;
  };
}

export function updateCategoryHandler(db: PgDatabase<any, any, any>) {
  return async (
    categoryId: string,
    input: z.infer<typeof UpdateCategoryCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [updated] = await db
      .update(categories)
      .set({
        ...input,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId),
          sql`${categories.archivedAt} IS NULL`
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Category not found or access unauthorized.");
    }

    return updated;
  };
}

export function createCategoryScheduleHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: z.infer<typeof CreateCategoryScheduleCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [schedule] = await db
      .insert(categorySchedules)
      .values({
        categoryId: input.categoryId,
        targetAmount: input.targetAmount,
        rrule: input.rrule || null,
        dueDate: input.dueDate || null,
        nextDueDate: input.dueDate || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return schedule;
  };
}

export function createIncomeSourceHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: z.infer<typeof CreateIncomeSourceCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [source] = await db
      .insert(incomeSources)
      .values({
        householdId: tenantId,
        name: input.name,
        type: input.type,
        amount: input.amount,
        receivingAccountId: input.receivingAccountId || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return source;
  };
}

export function createIncomeSourceScheduleHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: z.infer<typeof CreateIncomeSourceScheduleCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [schedule] = await db
      .insert(incomeSourceSchedules)
      .values({
        incomeSourceId: input.incomeSourceId,
        rrule: input.rrule,
        startDate: input.startDate,
        endDate: input.endDate || null,
        occurrenceCount: input.occurrenceCount || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return schedule;
  };
}

export function createIncomeEventHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: z.infer<typeof CreateIncomeEventCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [event] = await db
      .insert(incomeEvents)
      .values({
        incomeSourceId: input.incomeSourceId,
        expectedDate: input.expectedDate,
        expectedAmount: input.expectedAmount,
        status: "UPCOMING" as const,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return event;
  };
}

export function recordExpenseHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: z.infer<typeof RecordExpenseCommand>,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const [expense] = await db
      .insert(transactionLedger)
      .values({
        categoryId: input.categoryId,
        bankAccountId: input.bankAccountId || null,
        flowType: "DEBIT",
        amount: input.amount,
        idempotencyKey: input.idempotencyKey || `expense-manual-${randomUUID()}`,
        note: input.note || null,
        recordedAt: new Date(),
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return expense;
  };
}

export function resolveShortfallHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: z.infer<typeof ResolveShortfallCommand>,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    return await db.transaction(async (tx) => {
      // 1. Create the shortfall borrowing event record
      const [shortfall] = await tx
        .insert(shortfallEvents)
        .values({
          donorCategoryId: input.donorCategoryId,
          recipientCategoryId: input.recipientCategoryId,
          borrowedAmount: input.borrowedAmount,
          repaidAmount: "0.00",
          status: "BORROWED",
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // 2. Debit the donor category
      await tx
        .insert(transactionLedger)
        .values({
          categoryId: input.donorCategoryId,
          flowType: "DEBIT",
          amount: input.borrowedAmount,
          idempotencyKey: `shortfall-borrow-debit-${shortfall.id}-${randomUUID()}`,
          note: `Shortfall borrow donor: transferred to category ${input.recipientCategoryId}`,
          recordedAt: new Date(),
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });

      // 3. Credit the recipient category
      await tx
        .insert(transactionLedger)
        .values({
          categoryId: input.recipientCategoryId,
          flowType: "CREDIT",
          amount: input.borrowedAmount,
          idempotencyKey: `shortfall-borrow-credit-${shortfall.id}-${randomUUID()}`,
          note: `Shortfall borrow credit: received from category ${input.donorCategoryId}`,
          recordedAt: new Date(),
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });

      return shortfall;
    });
  };
}

export function listCategoriesWithHealth(db: PgDatabase<any, any, any>) {
  return async (tenantId: string, appId: string) => {
    // 1. Fetch all non-archived categories
    const dbCats = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId),
          sql`${categories.archivedAt} IS NULL`
        )
      );

    // 2. Fetch category schedules target info
    const dbSchedules = await db
      .select()
      .from(categorySchedules)
      .where(
        and(
          eq(categorySchedules.tenantId, tenantId),
          eq(categorySchedules.appId, appId),
          sql`${categorySchedules.archivedAt} IS NULL`
        )
      );

    const schedulesMap = new Map(
      dbSchedules.map(s => [s.categoryId, s])
    );

    // 3. Compute dynamic balances by query group aggregates
    const txRecords = await db
      .select({
        categoryId: transactionLedger.categoryId,
        amount: transactionLedger.amount,
        flowType: transactionLedger.flowType
      })
      .from(transactionLedger)
      .where(
        and(
          eq(transactionLedger.tenantId, tenantId),
          eq(transactionLedger.appId, appId),
          sql`${transactionLedger.archivedAt} IS NULL`
        )
      );

    const balancesMap = new Map<string, number>();
    for (const c of dbCats) {
      balancesMap.set(c.id, 0);
    }
    for (const tx of txRecords) {
      const amt = parseFloat(tx.amount);
      const current = balancesMap.get(tx.categoryId) || 0;
      if (tx.flowType === "CREDIT") {
        balancesMap.set(tx.categoryId, current + amt);
      } else {
        balancesMap.set(tx.categoryId, current - amt);
      }
    }

    // 4. Map output status and health
    const today = new Date();
    return dbCats.map(cat => {
      const balance = balancesMap.get(cat.id) || 0;
      const sched = schedulesMap.get(cat.id);
      
      let health: "GREEN" | "AMBER" | "RED" = "GREEN";
      let progressPct = 100;

      if (cat.type !== "EVERYDAY" && sched) {
        const target = parseFloat(sched.targetAmount);
        progressPct = target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : 100;

        if (balance <= 0) {
          health = "RED";
        } else if (sched.nextDueDate) {
          const dueDate = new Date(sched.nextDueDate);
          const timeDiff = dueDate.getTime() - today.getTime();
          // Alert RED if balance is insufficient and time is short
          if (timeDiff < 0 && balance < target) {
            health = "RED";
          } else if (balance < target * 0.5) {
            health = "AMBER";
          }
        }
      } else {
        // Everyday categories are green if they are positive, red if they dip below zero
        health = balance >= 0 ? "GREEN" : "RED";
      }

      return {
        ...cat,
        currentBalance: balance.toFixed(2),
        targetAmount: sched?.targetAmount || null,
        nextDueDate: sched?.nextDueDate || null,
        progressPercentage: progressPct,
        healthStatus: health
      };
    });
  };
}
