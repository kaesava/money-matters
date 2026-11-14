import { DEFAULT_TIMEZONE } from "@money-matters/types";
import { incomeSources, incomeEvents, bankAccounts, tenants, type DbOrTx } from "@money-matters/db";
import { getTenantDateString } from "@money-matters/core";
import { and, eq, sql, inArray } from "drizzle-orm";
import { burstIncomeEvents } from "./income-schedule.js";

export type IncomeFrequency = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
export type ContributionMode = "FULL" | "PERCENTAGE" | "FIXED_AMOUNT";

export async function getTenantLocalDateString(db: DbOrTx, tenantId: string, d: Date = new Date()): Promise<string> {
  const [tenantRecord] = await db.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return getTenantDateString(d, { timezone: tenantRecord?.timezone || DEFAULT_TIMEZONE });
}

export function buildIncomeRRule(frequency?: IncomeFrequency, interval = 1): string {
  if (frequency === "WEEKLY") return interval > 1 ? `FREQ=WEEKLY;INTERVAL=${interval}` : "FREQ=WEEKLY";
  if (frequency === "FORTNIGHTLY") return `FREQ=WEEKLY;INTERVAL=${interval * 2}`;
  if (frequency === "QUARTERLY") return `FREQ=MONTHLY;INTERVAL=${interval * 3}`;
  if (frequency === "ANNUALLY") return interval > 1 ? `FREQ=YEARLY;INTERVAL=${interval}` : "FREQ=YEARLY";
  return interval > 1 ? `FREQ=MONTHLY;INTERVAL=${interval}` : "FREQ=MONTHLY";
}

export async function verifyReceivingAccountAccess(
  accountId: string,
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
): Promise<void> {
  const [acc] = await db
    .select({ isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId), sql`${bankAccounts.archivedAt} IS NULL`))
    .limit(1);

  if (!acc || (acc.isPrivate && acc.userId !== userId)) {
    throw new Error("Receiving bank account not found.");
  }
}

export function validateContributionCap(mode: ContributionMode | undefined, value: string | null | undefined, total: string): void {
  if (mode === "FIXED_AMOUNT" && value && parseFloat(value) > parseFloat(total)) {
    throw new Error("Household contribution cannot exceed the expected income amount.");
  }
}

export interface CreateIncomeSourceInput {
  name: string;
  amount: string;
  receivingAccountId?: string;
  isRecurring: boolean;
  startDate?: string;
  endDate?: string | null;
  frequency?: IncomeFrequency;
  interval?: number;
  contributionMode?: ContributionMode;
  contributionValue?: string | null;
}

export async function createIncomeSourceCommand(
  input: CreateIncomeSourceInput,
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  if (input.receivingAccountId) {
    await verifyReceivingAccountAccess(input.receivingAccountId, tenantId, appId, userId, db);
  }
  validateContributionCap(input.contributionMode, input.contributionValue, input.amount);

  if (!input.isRecurring) {
    const eventDate = input.startDate || (await getTenantLocalDateString(db, tenantId));
    const [source] = await db
      .insert(incomeSources)
      .values({
        name: input.name,
        amount: input.amount,
        receivingAccountId: input.receivingAccountId || null,
        rrule: null,
        startDate: eventDate,
        endDate: null,
        contributionMode: input.contributionMode || "FULL",
        contributionValue: input.contributionValue || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const [insertedEvent] = await db
      .insert(incomeEvents)
      .values({
        incomeSourceId: source.id,
        name: input.name,
        expectedDate: eventDate,
        actualDate: eventDate,
        expectedAmount: input.amount,
        actualAmount: input.amount,
        contributionMode: input.contributionMode || "FULL",
        contributionValue: input.contributionValue || null,
        status: "PENDING" as const,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return { ...source, firstEventId: insertedEvent.id };
  }

  const rrule = input.startDate ? buildIncomeRRule(input.frequency, input.interval ?? 1) : null;
  const [source] = await db
    .insert(incomeSources)
    .values({
      name: input.name,
      amount: input.amount,
      receivingAccountId: input.receivingAccountId || null,
      rrule,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      contributionMode: input.contributionMode || "FULL",
      contributionValue: input.contributionValue || null,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  if (input.startDate && rrule) {
    const [tenantRecord] = await db.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    await burstIncomeEvents(db, {
      incomeSourceId: source.id,
      name: input.name,
      amount: input.amount,
      rrule,
      startDate: input.startDate,
      endDate: input.endDate,
      contributionMode: input.contributionMode,
      contributionValue: input.contributionValue,
      tenantId,
      appId,
      userId,
      timeZone: tenantRecord?.timezone || DEFAULT_TIMEZONE,
    });
  }

  return { ...source, firstEventId: null as string | null };
}

export interface UpdateIncomeSourceInput {
  id: string;
  data: {
    name?: string;
    amount?: string;
    receivingAccountId?: string;
    isRecurring?: boolean;
    startDate?: string;
    endDate?: string | null;
    frequency?: IncomeFrequency;
    interval?: number;
    contributionMode?: ContributionMode;
    contributionValue?: string | null;
  };
}

function inferFrequencyFromRRule(rrule: string | null): IncomeFrequency {
  if (rrule?.includes("FREQ=WEEKLY")) return rrule.includes("INTERVAL=2") ? "FORTNIGHTLY" : "WEEKLY";
  if (rrule?.includes("FREQ=YEARLY")) return "ANNUALLY";
  if (rrule?.includes("INTERVAL=3")) return "QUARTERLY";
  return "MONTHLY";
}

export async function updateIncomeSourceCommand(
  input: UpdateIncomeSourceInput,
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  const [sourceRow] = await db
    .select({ source: incomeSources, bankAccountIsPrivate: bankAccounts.isPrivate, bankAccountUserId: bankAccounts.userId })
    .from(incomeSources)
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(and(eq(incomeSources.id, input.id), eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), sql`${incomeSources.archivedAt} IS NULL`));

  if (!sourceRow || (sourceRow.bankAccountIsPrivate && sourceRow.bankAccountUserId !== userId)) {
    throw new Error("Income source not found or unauthorized.");
  }
  if (input.data.receivingAccountId) {
    await verifyReceivingAccountAccess(input.data.receivingAccountId, tenantId, appId, userId, db);
  }

  const source = sourceRow.source;
  const events = await db.select().from(incomeEvents).where(and(eq(incomeEvents.incomeSourceId, source.id), sql`${incomeEvents.archivedAt} IS NULL`));
  const confirmedEvents = events.filter((e) => e.status !== "PENDING");
  const unperformedEvents = events.filter((e) => e.status === "PENDING");

  const newName = input.data.name ?? source.name;
  const newAmount = input.data.amount ?? source.amount;
  const newReceivingAccountId = input.data.receivingAccountId !== undefined ? input.data.receivingAccountId : source.receivingAccountId;
  const newEndDate = input.data.endDate !== undefined ? input.data.endDate : source.endDate;
  const wasRecurring = Boolean(source.rrule);
  const isRecurring = input.data.isRecurring !== undefined ? input.data.isRecurring : wasRecurring;
  const newStartDate =
    input.data.startDate ||
    source.startDate ||
    unperformedEvents[0]?.expectedDate ||
    (await getTenantLocalDateString(db, tenantId));

  if (!isRecurring) {
    await db
      .update(incomeEvents)
      .set({ incomeSourceId: null })
      .where(and(eq(incomeEvents.incomeSourceId, source.id), eq(incomeEvents.status, "CONFIRMED"), eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));

    if (unperformedEvents.length > 0) {
      await db
        .update(incomeEvents)
        .set({ archivedAt: new Date(), archivedBy: userId, updatedBy: userId, updatedAt: new Date() })
        .where(inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)));
    }

    const [oneOffEvent] = await db
      .insert(incomeEvents)
      .values({
        incomeSourceId: null,
        name: newName,
        expectedDate: newStartDate,
        expectedAmount: newAmount,
        status: "PENDING" as const,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    await db
      .update(incomeSources)
      .set({ archivedAt: new Date(), archivedBy: userId, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(incomeSources.id, source.id), eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

    return { updated: null, hasConfirmedHistory: confirmedEvents.length > 0, unperformedUpdatedCount: unperformedEvents.length, deletedScheduleId: source.id, firstEventId: oneOffEvent.id };
  }

  let rrule: string | null = source.rrule || "FREQ=MONTHLY";
  if (input.data.frequency || input.data.interval !== undefined) {
    rrule = buildIncomeRRule(input.data.frequency || inferFrequencyFromRRule(source.rrule), input.data.interval ?? 1);
  }

  const targetMode = (input.data.contributionMode ?? source.contributionMode) as ContributionMode;
  const targetValue = input.data.contributionValue !== undefined ? input.data.contributionValue : source.contributionValue;
  validateContributionCap(targetMode, targetValue, newAmount);

  const scheduleChanged =
    rrule !== source.rrule ||
    (input.data.startDate !== undefined && input.data.startDate !== source.startDate) ||
    (input.data.endDate !== undefined && input.data.endDate !== (source.endDate || null)) ||
    (!wasRecurring && isRecurring);
  const detailChanged =
    newName !== source.name ||
    parseFloat(newAmount) !== parseFloat(source.amount) ||
    targetMode !== source.contributionMode ||
    targetValue !== source.contributionValue;

  let newLastBurstDate: string | null = null;
  if (scheduleChanged || unperformedEvents.length === 0) {
    if (unperformedEvents.length > 0) {
      await db
        .update(incomeEvents)
        .set({ archivedAt: new Date(), archivedBy: userId, updatedBy: userId, updatedAt: new Date() })
        .where(inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)));
    }
    if (rrule) {
      const [tenantRecord] = await db.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      const timeZone = tenantRecord?.timezone || DEFAULT_TIMEZONE;
      const todayStr = getTenantDateString(new Date(), { timezone: timeZone });
      const yesterdayStr = getTenantDateString(new Date(Date.now() - 86400000), { timezone: timeZone });
      const count = await burstIncomeEvents(db, {
        incomeSourceId: source.id,
        name: newName,
        amount: newAmount,
        rrule,
        startDate: newStartDate,
        endDate: newEndDate,
        contributionMode: targetMode,
        contributionValue: targetValue,
        tenantId,
        appId,
        userId,
        timeZone,
        afterDateStr: newStartDate < todayStr ? yesterdayStr : null,
      });
      if (count === 0 && newEndDate) newLastBurstDate = newEndDate;
    }
  } else if (detailChanged && unperformedEvents.length > 0) {
    await db
      .update(incomeEvents)
      .set({ name: newName, expectedAmount: newAmount, actualAmount: newAmount, contributionMode: targetMode, contributionValue: targetValue, updatedBy: userId, updatedAt: new Date() })
      .where(inArray(incomeEvents.id, unperformedEvents.map((e) => e.id)));
  }

  const [updated] = await db
    .update(incomeSources)
    .set({
      name: newName,
      amount: newAmount,
      receivingAccountId: newReceivingAccountId,
      rrule,
      startDate: newStartDate,
      endDate: newEndDate,
      ...(newLastBurstDate !== null ? { lastBurstDate: newLastBurstDate } : {}),
      ...(input.data.contributionMode !== undefined ? { contributionMode: input.data.contributionMode } : {}),
      ...(input.data.contributionValue !== undefined ? { contributionValue: input.data.contributionValue } : {}),
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(incomeSources.id, source.id))
    .returning();

  return { updated, hasConfirmedHistory: confirmedEvents.length > 0, unperformedUpdatedCount: unperformedEvents.length };
}

export async function listIncomeSourcesQuery(tenantId: string, appId: string, userId: string, db: DbOrTx) {
  const rows = await db
    .select({
      id: incomeSources.id,
      name: incomeSources.name,
      amount: incomeSources.amount,
      receivingAccountId: incomeSources.receivingAccountId,
      rrule: incomeSources.rrule,
      startDate: incomeSources.startDate,
      endDate: incomeSources.endDate,
      contributionMode: incomeSources.contributionMode,
      contributionValue: incomeSources.contributionValue,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(incomeSources)
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), sql`${incomeSources.archivedAt} IS NULL`, sql`${incomeSources.rrule} IS NOT NULL`));

  return rows.filter((r) => !(r.receivingAccountId && r.bankAccountIsPrivate === null) && !(r.bankAccountIsPrivate && r.bankAccountUserId !== userId));
}
