import { pools, bankAccounts, incomeEvents, getPoolBalancesMap, DbOrTx } from "@money-matters/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { CanAffordVerdictType } from "@money-matters/types";


import { getTenantDateString } from "@money-matters/core";

const getAestDateString = (d: Date = new Date()) => getTenantDateString(d);

export async function canAffordQuery(
  amount: number,
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  includePersonal = false
): Promise<CanAffordVerdictType> {
  const today = new Date();
  const todayStr = getAestDateString(today);

  // 1. Fetch Pools & Bank Accounts
  const dbPools = await dbClient
    .select({
      id: pools.id,
      name: pools.name,
      poolType: pools.poolType,
      bankAccountId: pools.bankAccountId,
      isCommitted: pools.isCommitted,
      isSurplusTarget: pools.isSurplusTarget,
      isPrivate: bankAccounts.isPrivate,
    })
    .from(pools)
    .innerJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(pools.tenantId, tenantId),
        eq(pools.appId, appId),
        sql`${pools.archivedAt} IS NULL`
      )
    );

  // Filter everyday pools: exclude private pools if includePersonal is false
  const everydayPools = dbPools.filter(
    (p) => p.poolType === "EVERYDAY" && (includePersonal || !p.isPrivate)
  );

  const everydayPoolIds = new Set(everydayPools.map((p) => p.id));

  // 2. Compute balances using DB-side aggregate SUM(CASE WHEN...)
  const poolBalancesMap = await getPoolBalancesMap(tenantId, appId, dbClient);

  // Calculate Everyday Pool Total
  let everydayBalance = 0;
  for (const poolId of everydayPoolIds) {
    everydayBalance += poolBalancesMap[poolId] || 0;
  }

  // 3. Query upcoming paychecks to determine next payday date
  const upcomingPaychecks = await dbClient
    .select()
    .from(incomeEvents)
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        eq(incomeEvents.status, "PENDING"),
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(desc(incomeEvents.expectedDate));

  const nextPaycheck = upcomingPaychecks[upcomingPaychecks.length - 1]; // Next upcoming paycheck
  const nextPaycheckDateStr = nextPaycheck ? nextPaycheck.expectedDate : getAestDateString(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000));
  const daysUntilPayday = Math.max(1, Math.ceil((new Date(nextPaycheckDateStr + "T00:00:00+10:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const netAvailableCash = Math.max(0, everydayBalance);

  // Verdict 1: SAFE_YES (Available cash covers purchase AND daily pacing >= $15/day)
  if (amount <= netAvailableCash) {

    const everydayRemaining = (everydayBalance - amount).toFixed(2);
    const netRemainingAfterSpend = everydayBalance - amount;
    const dailyPacing = (netRemainingAfterSpend / daysUntilPayday).toFixed(2);
    const numDailyPacing = parseFloat(dailyPacing);

    const rationaleSteps = [
      `Available Everyday Pool Cash: $${everydayBalance.toFixed(2)}${includePersonal ? " (includes Personal Pools)" : ""}`,
      `Net Remaining Discretionary: $${netRemainingAfterSpend.toFixed(2)}`,
      `Daily Allowance Velocity (${daysUntilPayday} days left): $${dailyPacing}/day`,
    ];

    if (numDailyPacing >= 15) {
      return {
        verdict: "SAFE_YES",
        availableCash: everydayBalance.toFixed(2),
        everydayRemaining,
        daysUntilPayday,
        dailyPacingAfterSpend: dailyPacing,
        rationaleSteps,
      };
    } else {
      // Verdict 2: PACING_WARNING (Cash available, but severe daily spending starvation)
      return {
        verdict: "PACING_WARNING",
        availableCash: everydayBalance.toFixed(2),
        everydayRemaining,
        daysUntilPayday,
        dailyPacingAfterSpend: dailyPacing,
        rationaleSteps,
      };
    }
  }

  // Verdict 3: IMPACT_GOALS (Dips into uncommitted savings surplus pool)
  let bestSavingsId = "";
  let bestSavingsName = "";
  let bestSavingsSurplus = 0;

  for (const pool of dbPools) {
    if (pool.poolType === "GOAL" && !pool.isCommitted) {
      if (!includePersonal && pool.isPrivate) continue;
      const balance = Math.max(0, poolBalancesMap[pool.id] || 0);
      if (balance > bestSavingsSurplus) {
        bestSavingsSurplus = balance;
        bestSavingsId = pool.id;
        bestSavingsName = pool.name;
      }
    }
  }

  const everydayDeficit = everydayBalance < 0 ? Math.abs(everydayBalance) : 0;
  const netAvailableBeforeDeficit = Math.max(0, everydayBalance);

  if (amount <= netAvailableBeforeDeficit + (bestSavingsSurplus - everydayDeficit) && bestSavingsSurplus > everydayDeficit) {
    const goalSurplusUsed = (amount - netAvailableBeforeDeficit + everydayDeficit).toFixed(2);
    const newGoalBalance = (bestSavingsSurplus - parseFloat(goalSurplusUsed)).toFixed(2);

    return {
      verdict: "IMPACT_GOALS",
      availableCash: everydayBalance.toFixed(2),
      affectedGoalId: bestSavingsId,
      affectedGoalName: bestSavingsName,
      goalSurplusUsed,
      newGoalBalance,
      rationaleSteps: [
        `Everyday Cash Available: $${everydayBalance.toFixed(2)}`,
        `Shortfall in Everyday: -$${(amount - netAvailableBeforeDeficit + everydayDeficit).toFixed(2)}`,
        `Covered by uncommitted goal pool "${bestSavingsName}": $${goalSurplusUsed} used (new balance: $${newGoalBalance})`,
      ],
    };
  }

  // Verdict 4: WAIT_FOR_PAYDAY (Paycheck arriving within 14 days will cover gap)
  if (nextPaycheck && daysUntilPayday <= 14) {
    const paycheckAmount = parseFloat(nextPaycheck.expectedAmount);
    if ((netAvailableCash + paycheckAmount) >= amount) {
      const shortfall = (amount - netAvailableCash).toFixed(2);
      return {
        verdict: "WAIT_FOR_PAYDAY",
        daysUntilNextPaycheck: daysUntilPayday,
        amountExpected: paycheckAmount.toFixed(2),
        shortfall,
        rationaleSteps: [
          `Everyday Net Available: $${netAvailableCash.toFixed(2)}`,
          `Purchase Amount: $${amount.toFixed(2)}`,
          `Shortfall: -$${shortfall}`,
          `Next Paycheck of $${paycheckAmount.toFixed(2)} arrives in ${daysUntilPayday} days on ${nextPaycheckDateStr}.`,
        ],
      };
    }
  }

  // Verdict 5: HARD_NO
  const shortfall = (amount - netAvailableCash).toFixed(2);
  return {
    verdict: "HARD_NO",
    shortfall,
    rationaleSteps: [
      `Everyday Cash Available: $${everydayBalance.toFixed(2)}`,
      `Net Available: $${netAvailableCash.toFixed(2)}`,
      `Shortfall: -$${shortfall} against purchase of $${amount.toFixed(2)}.`,
    ],
  };
}
