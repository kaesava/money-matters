import { envelopes, bankAccounts, expenseEvents, DbOrTx, getEnvelopeBalancesMap } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { EnvelopeListItemDto, FundingMode } from "@money-matters/types";

export async function listEnvelopesQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  userId?: string
): Promise<EnvelopeListItemDto[]> {
  // 1. Fetch envelopes joined with bankAccounts for stealth privacy
  const envelopeFilters = [
    eq(envelopes.tenantId, tenantId),
    eq(envelopes.appId, appId),
    sql`${envelopes.archivedAt} IS NULL`,
  ];

  const dbEnvelopes = await dbClient
    .select({
      id: envelopes.id,
      name: envelopes.name,
      envelopeType: envelopes.envelopeType,
      bankAccountId: envelopes.bankAccountId,
      safetyBufferFloor: envelopes.safetyBufferFloor,
      monthlyAmount: envelopes.monthlyAmount,
      enteredAmount: envelopes.enteredAmount,
      budgetFrequency: envelopes.budgetFrequency,
      startDate: envelopes.startDate,
      endDate: envelopes.endDate,
      rrule: envelopes.rrule,
      goalMode: envelopes.goalMode,
      targetAmount: envelopes.targetAmount,
      isEssential: envelopes.isEssential,
      isCommitted: envelopes.isCommitted,
      isSurplusTarget: envelopes.isSurplusTarget,
      isPrivate: envelopes.isPrivate,
      generateEvents: envelopes.generateEvents,
      userId: envelopes.userId,
      orderIndex: envelopes.orderIndex,
      createdAt: envelopes.createdAt,
      bankAccountName: bankAccounts.name,
      bankAccountUserId: bankAccounts.userId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(and(...envelopeFilters));

  const visibleEnvelopes = userId
    ? dbEnvelopes.filter((e) => {
        // If linked to a bank account that was hidden by RLS, it belongs to another user's private account
        if (e.bankAccountId && e.bankAccountIsPrivate === null) {
          return false;
        }

        const isPrivate = Boolean(e.isPrivate || e.bankAccountIsPrivate);
        if (!isPrivate) return true;
        const ownerId = e.userId || e.bankAccountUserId;
        return ownerId === userId;
      })
    : dbEnvelopes;

  // 2. Compute balances using DB-side aggregate SUM(CASE WHEN...)
  const balancesMap = await getEnvelopeBalancesMap(tenantId, appId, dbClient);

  // 3. Check for active scheduled pending events per envelope
  const scheduledCounts = await dbClient
    .select({
      envelopeId: expenseEvents.envelopeId,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.isScheduled, true),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    )
    .groupBy(expenseEvents.envelopeId);
  const scheduledMap = new Set(scheduledCounts.map((s) => s.envelopeId));

  // 4. Determine health status & progress percentage
  const today = new Date();

  return visibleEnvelopes.map((env) => {
    const currentBalance = balancesMap[env.id] || 0;
    let healthStatus: "GREEN" | "AMBER" | "RED" = "GREEN";
    let progressPercentage = 0;

    if (currentBalance < 0) {
      healthStatus = "RED";
    } else if (env.envelopeType === "TARGET_GOAL" || env.envelopeType === "ONGOING_GOAL") {
      if (env.envelopeType === "ONGOING_GOAL" || env.goalMode === "ONGOING") {
        progressPercentage = currentBalance > 0 ? 100 : 0;
        healthStatus = "GREEN";
      } else {
        const target = env.targetAmount ? parseFloat(env.targetAmount) : 0;
        progressPercentage = target > 0 ? Math.min(100, Math.round((currentBalance / target) * 100)) : 0;
        if (env.endDate) {
          const targetD = new Date(env.endDate + "T00:00:00Z").getTime();
          const todayUtc = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(today) + "T00:00:00Z").getTime();
          if (todayUtc > targetD && currentBalance < target) {
            healthStatus = "RED";
          } else if (progressPercentage < 50) {
            healthStatus = "AMBER";
          }
        }
      }
    } else if (env.envelopeType === "SCHEDULED_BILL" || env.envelopeType === "FLEXIBLE_BILL") {
      const target = env.monthlyAmount ? parseFloat(env.monthlyAmount) : (env.targetAmount ? parseFloat(env.targetAmount) : 0);
      progressPercentage = target > 0 ? Math.min(100, Math.round((currentBalance / target) * 100)) : 0;
      if (target > 0 && currentBalance < target) {
        healthStatus = currentBalance < target * 0.8 ? "RED" : "AMBER";
      }
    } else if (env.envelopeType === "EVERYDAY") {
      healthStatus = currentBalance >= 0 ? "GREEN" : "RED";
    }

    const isBill = env.envelopeType === "SCHEDULED_BILL" || env.envelopeType === "FLEXIBLE_BILL";
    const isGoal = env.envelopeType === "TARGET_GOAL" || env.envelopeType === "ONGOING_GOAL";
    const fundingMode: FundingMode | null = isBill
      ? (env.envelopeType === "SCHEDULED_BILL" ? "RECURRING" : "TARGET_BALANCE")
      : isGoal
      ? (env.envelopeType === "TARGET_GOAL" || env.goalMode === "TARGET_DATE" ? "TARGET_BALANCE" : "RECURRING")
      : null;
    const isPriority = Boolean(env.isEssential || env.isCommitted);

    return {
      id: env.id,
      name: env.name,
      envelopeType: env.envelopeType,
      fundingMode,
      isPriority,
      bankAccountId: env.bankAccountId,
      bankAccountName: env.bankAccountName || null,
      safetyBufferFloor: env.safetyBufferFloor,
      monthlyAmount: env.monthlyAmount,
      enteredAmount: env.enteredAmount,
      budgetFrequency: env.budgetFrequency,
      startDate: env.startDate,
      endDate: env.endDate,
      rrule: env.rrule,
      goalMode: env.goalMode,
      targetAmount: env.targetAmount,
      isEssential: env.isEssential,
      isCommitted: env.isCommitted,
      isSurplusTarget: env.isSurplusTarget,
      isPrivate: env.isPrivate,
      userId: env.userId,
      orderIndex: env.orderIndex,
      createdAt: env.createdAt,
      currentBalance,
      healthStatus,
      progressPercentage,
      hasScheduledEvents: scheduledMap.has(env.id),
      generateEvents: env.generateEvents,
    };
  });
}
