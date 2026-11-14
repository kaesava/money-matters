import { incomeSources, incomeEvents, bankAccounts, type DbOrTx } from "@money-matters/db";
import { and, eq, sql, asc } from "drizzle-orm";
import {
  verifyReceivingAccountAccess,
  validateContributionCap,
  type ContributionMode,
} from "./income-sources.command.js";

async function loadVisibleIncomeEvent(eventId: string, tenantId: string, appId: string, userId: string, db: DbOrTx) {
  const [evt] = await db
    .select({
      id: incomeEvents.id,
      incomeSourceId: incomeEvents.incomeSourceId,
      expectedAmount: incomeEvents.expectedAmount,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(and(eq(incomeEvents.id, eventId), eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId), sql`${incomeEvents.archivedAt} IS NULL`))
    .limit(1);

  if (!evt || (evt.bankAccountIsPrivate && evt.bankAccountUserId !== userId)) {
    throw new Error("Income event not found.");
  }
  return evt;
}

export async function createIncomeEventCommand(
  input: {
    incomeSourceId?: string;
    name?: string;
    expectedDate: string;
    expectedAmount: string;
    contributionMode?: ContributionMode;
    contributionValue?: string | null;
  },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  if (input.incomeSourceId) {
    const [source] = await db
      .select({ bankAccountIsPrivate: bankAccounts.isPrivate, bankAccountUserId: bankAccounts.userId })
      .from(incomeSources)
      .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
      .where(and(eq(incomeSources.id, input.incomeSourceId), eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), sql`${incomeSources.archivedAt} IS NULL`));

    if (!source || (source.bankAccountIsPrivate && source.bankAccountUserId !== userId)) {
      throw new Error("Income source not found.");
    }
  }

  const [event] = await db
    .insert(incomeEvents)
    .values({
      incomeSourceId: input.incomeSourceId,
      name: input.name || null,
      expectedDate: input.expectedDate,
      actualDate: input.expectedDate,
      expectedAmount: input.expectedAmount,
      actualAmount: input.expectedAmount,
      contributionMode: input.contributionMode || "FULL",
      contributionValue: input.contributionValue || null,
      status: "PENDING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();
  return event;
}

export async function listIncomeEventsQuery(tenantId: string, appId: string, userId: string, db: DbOrTx) {
  const events = await db
    .select({
      id: incomeEvents.id,
      name: sql<string>`COALESCE(NULLIF(${incomeEvents.name}, ''), ${incomeSources.name}, 'Paycheck')`,
      expectedDate: incomeEvents.expectedDate,
      actualDate: incomeEvents.actualDate,
      expectedAmount: incomeEvents.expectedAmount,
      actualAmount: incomeEvents.actualAmount,
      contributionMode: sql<string>`COALESCE(${incomeEvents.contributionMode}, ${incomeSources.contributionMode}, 'FULL')`,
      contributionValue: sql<string | null>`COALESCE(${incomeEvents.contributionValue}, ${incomeSources.contributionValue})`,
      status: incomeEvents.status,
      note: incomeEvents.note,
      incomeSourceId: incomeEvents.incomeSourceId,
      sourceName: incomeSources.name,
      bankAccountId: incomeSources.receivingAccountId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
      createdBy: incomeEvents.createdBy,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId), sql`${incomeEvents.archivedAt} IS NULL`))
    .orderBy(asc(incomeEvents.expectedDate));

  const visibleEvents = events.filter((e) => {
    if (e.bankAccountId && e.bankAccountIsPrivate === null) return false;
    if (e.bankAccountIsPrivate && e.bankAccountUserId !== userId) return false;
    if (!e.incomeSourceId && e.createdBy && e.createdBy !== userId) return false;
    return true;
  });

  const nextId = visibleEvents.find((e) => e.status === "PENDING")?.id;
  return visibleEvents.map((e) => ({ ...e, isNextPayday: e.id === nextId }));
}

export async function createUpcomingIncomeCommand(
  input: {
    name: string;
    amount: string;
    expectedDate: string;
    receivingAccountId?: string;
    contributionMode?: ContributionMode;
    contributionValue?: string | null;
    note?: string;
  },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  validateContributionCap(input.contributionMode, input.contributionValue, input.amount);
  if (input.receivingAccountId) {
    await verifyReceivingAccountAccess(input.receivingAccountId, tenantId, appId, userId, db);
  }

  const [source] = await db
    .insert(incomeSources)
    .values({
      name: input.name,
      amount: input.amount,
      receivingAccountId: input.receivingAccountId || null,
      rrule: null,
      startDate: input.expectedDate,
      contributionMode: input.contributionMode || "FULL",
      contributionValue: input.contributionValue || null,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [evt] = await db
    .insert(incomeEvents)
    .values({
      incomeSourceId: source.id,
      name: input.name,
      expectedDate: input.expectedDate,
      actualDate: input.expectedDate,
      expectedAmount: input.amount,
      actualAmount: input.amount,
      contributionMode: input.contributionMode || "FULL",
      contributionValue: input.contributionValue || null,
      note: input.note || null,
      status: "PENDING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  return evt;
}

export async function updateUpcomingIncomeCommand(
  input: {
    eventId: string;
    expectedAmount?: string;
    expectedDate?: string;
    contributionMode?: ContributionMode;
    contributionValue?: string | null;
  },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  const existing = await loadVisibleIncomeEvent(input.eventId, tenantId, appId, userId, db);
  const isScheduled = Boolean(existing.incomeSourceId);
  const setPayload: Record<string, unknown> = { updatedAt: new Date(), updatedBy: userId };

  if (input.expectedAmount !== undefined) {
    setPayload.actualAmount = input.expectedAmount;
    if (!isScheduled) setPayload.expectedAmount = input.expectedAmount;
  }
  if (input.expectedDate !== undefined) {
    setPayload.actualDate = input.expectedDate;
    if (!isScheduled) setPayload.expectedDate = input.expectedDate;
  }

  const [updated] = await db
    .update(incomeEvents)
    .set(setPayload)
    .where(and(eq(incomeEvents.id, input.eventId), eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)))
    .returning();
  return updated;
}

export async function markIncomeReceivedCommand(
  input: { eventId: string; actualAmount?: string },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  const evt = await loadVisibleIncomeEvent(input.eventId, tenantId, appId, userId, db);
  const amountToReceive = input.actualAmount || evt.expectedAmount;

  await db
    .update(incomeEvents)
    .set({ status: "CONFIRMED", actualAmount: amountToReceive, updatedAt: new Date(), updatedBy: userId })
    .where(eq(incomeEvents.id, input.eventId));

  return { success: true, message: "Income marked as received." };
}

export async function deleteIncomeEventCommand(eventId: string, tenantId: string, appId: string, userId: string, db: DbOrTx) {
  await loadVisibleIncomeEvent(eventId, tenantId, appId, userId, db);
  await db
    .update(incomeEvents)
    .set({ archivedAt: new Date(), archivedBy: userId, updatedAt: new Date(), updatedBy: userId })
    .where(and(eq(incomeEvents.id, eventId), eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));
  return { success: true };
}
