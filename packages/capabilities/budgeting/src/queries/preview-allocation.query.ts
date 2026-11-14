import { envelopes, incomeEvents, incomeSources, expenseEvents, bankAccounts, tenants, getEnvelopeBalancesMap, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";
import { parseRruleFrequencyDays } from "../commands/run-allocation.command.js";
import { getTenantDateString } from "@money-matters/core";
import { SUPPORTED_CURRENCIES, DEFAULT_TIMEZONE } from "@money-matters/types";

export async function previewAllocationQuery(
  tenantId: string,
  appId: string,
  incomeEventId: string,
  incomeAmount: number,
  dbClient: DbOrTx,
  runwayDays?: number,
  userId?: string
) {
  // 0. Fetch Tenant for currency and timezone
  const [tenantRecord] = await dbClient
    .select({ timezone: tenants.timezone, currency: tenants.currency })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantTz = tenantRecord?.timezone || DEFAULT_TIMEZONE;
  const currencyCode = tenantRecord?.currency || "AUD";
  const currencySymbol = SUPPORTED_CURRENCIES[currencyCode]?.symbol || "$";

  // 1. Fetch Envelopes joined with bankAccounts
  const rawEnvelopes = await dbClient
    .select({
      envelope: envelopes,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`
      )
    );

  const dbEnvelopes = rawEnvelopes
    .filter((row) => {
      if (!userId) return true;
      if (row.envelope.isPrivate && row.envelope.userId !== userId) return false;
      if (row.bankAccountIsPrivate && row.bankAccountUserId !== userId) return false;
      return true;
    })
    .map((row) => row.envelope);

  // 2. Compute balances using DB-side aggregate SUM(CASE WHEN...)
  const balancesMap = await getEnvelopeBalancesMap(tenantId, appId, dbClient);

  // 3. Fetch income event joined with income source and bank account
  const [event] = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      rrule: incomeSources.rrule,
      incomeType: incomeSources.incomeType,
      contributionMode: sql<"FULL" | "PERCENTAGE" | "FIXED_AMOUNT">`COALESCE(${incomeEvents.contributionMode}, ${incomeSources.contributionMode}, 'FULL')`,
      contributionValue: sql<string | null>`COALESCE(${incomeEvents.contributionValue}, ${incomeSources.contributionValue})`,
      createdBy: incomeEvents.createdBy,
      sourceCreatedBy: incomeSources.createdBy,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(eq(incomeEvents.id, incomeEventId));

  if (
    userId &&
    event?.bankAccountIsPrivate &&
    event.bankAccountUserId !== userId
  ) {
    throw new Error("Target income event not found.");
  }

  const rawCreator = event?.createdBy && event.createdBy !== "system" ? event.createdBy : undefined;
  const rawSourceCreator = event?.sourceCreatedBy && event.sourceCreatedBy !== "system" ? event.sourceCreatedBy : undefined;
  const incomeUserId = event?.bankAccountIsPrivate
    ? (event.bankAccountUserId || userId)
    : (rawCreator ?? rawSourceCreator ?? userId);

  let freqDays = 14;
  if (event?.rrule) {
    freqDays = parseRruleFrequencyDays(event.rrule);
  }

  const todayStr = getTenantDateString(new Date(), { timezone: tenantTz });
  const bufferDays = 3;
  const eventTime = event ? new Date(event.expectedDate + "T00:00:00").getTime() : Date.now();
  const forwardWindowDays = 90;
  const forwardCutoffDateStr = getTenantDateString(new Date(eventTime + forwardWindowDays * 24 * 60 * 60 * 1000), { timezone: tenantTz });

  const pendingExpenses = await dbClient
    .select({
      id: expenseEvents.id,
      envelopeId: expenseEvents.envelopeId,
      name: expenseEvents.name,
      amount: expenseEvents.expectedAmount,
      dueDate: expenseEvents.expectedDate,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.expectedDate} <= ${forwardCutoffDateStr}`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  const visibleEnvelopeIds = new Set(dbEnvelopes.map((e) => e.id));
  const filteredPendingExpenses = pendingExpenses.filter((e) => visibleEnvelopeIds.has(e.envelopeId));

  const { mapEnvelopeToEngineBucket } = await import("../engine/envelope-engine-mapper.js");
  const { getActiveAllocationStrategyQuery } = await import("./get-active-allocation-strategy.query.js");
  const activeStrategy = await getActiveAllocationStrategyQuery(tenantId, appId, userId, dbClient, false);
  const personalStrategy = incomeUserId
    ? await getActiveAllocationStrategyQuery(tenantId, appId, incomeUserId, dbClient, true)
    : null;

  const engineBuckets: EngineBucket[] = dbEnvelopes.map((env) =>
    mapEnvelopeToEngineBucket(env, balancesMap[env.id] || 0)
  );

  const output = runAllocationEngine({
    incomeAmount,
    incomeType: event?.incomeType || "SALARIED",
    incomeUserId,
    contributionMode: event?.contributionMode || "FULL",
    contributionValue: event?.contributionValue ? parseFloat(event.contributionValue) : null,
    strategySteps: activeStrategy?.steps?.map((s) => ({
      stepType: s.stepType,
      targetEnvelopeId: s.targetEnvelopeId,
      config: s.config as Record<string, unknown> | null,
    })),
    personalStrategySteps: personalStrategy?.steps?.map((s) => ({
      stepType: s.stepType,
      targetEnvelopeId: s.targetEnvelopeId,
      config: s.config as Record<string, unknown> | null,
    })),
    runwayDays: runwayDays ?? 30,
    buckets: engineBuckets,
    paycheckDate: event ? new Date(event.expectedDate + "T00:00:00Z") : new Date(),
    paycheckFrequencyDays: freqDays,
    dueBufferDays: bufferDays,
    timezone: tenantTz,
    currencySymbol,
    upcomingExpenses: filteredPendingExpenses.map((e) => ({
      envelopeId: e.envelopeId,
      name: e.name,
      amount: parseFloat(e.amount),
      dueDate: e.dueDate,
    })),
  });

  return output;
}
