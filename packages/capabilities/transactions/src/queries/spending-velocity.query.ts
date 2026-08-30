import { pools, transactionLedger, incomeEvents, DbOrTx } from "@money-matters/db";
import { eq, and, sql, gte } from "drizzle-orm";

export interface SpendingVelocityResult {
  everydayBalance: string;
  daysUntilNextPayday: number;
  currentDailySpendPace: string;
  recommendedDailyCap: string;
  isPaceWarning: boolean;
  warningMessage: string | null;
}

/**
 * Calculates Everyday pool spending velocity & pace warning.
 */
export async function getSpendingVelocityQuery(
  tenantId: string,
  appId: string,
  db: DbOrTx
): Promise<SpendingVelocityResult> {
  // 1. Fetch Everyday pool
  const [everydayPool] = await db
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.tenantId, tenantId),
        eq(pools.appId, appId),
        eq(pools.poolType, "EVERYDAY"),
        sql`${pools.archivedAt} IS NULL`
      )
    )
    .limit(1);

  // Compute current ledger balance for Everyday pool
  let balanceNum = 0;
  if (everydayPool) {
    const [balanceRes] = await db
      .select({
        balance: sql<string>`COALESCE(SUM(CASE WHEN ${transactionLedger.flowType} = 'CREDIT' THEN ${transactionLedger.amount} ELSE -${transactionLedger.amount} END), 0)::text`,
      })
      .from(transactionLedger)
      .where(
        and(
          eq(transactionLedger.tenantId, tenantId),
          eq(transactionLedger.appId, appId),
          eq(transactionLedger.poolId, everydayPool.id),
          sql`${transactionLedger.archivedAt} IS NULL`
        )
      );

    balanceNum = parseFloat(balanceRes?.balance || everydayPool.everydayAllowanceAmount || "0");
  }

  // 2. Fetch next upcoming income event
  const todayStr = new Date().toISOString().split("T")[0];
  const [nextPayday] = await db
    .select()
    .from(incomeEvents)
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        gte(incomeEvents.expectedDate, todayStr),
        sql`${incomeEvents.status} != 'CONFIRMED'`
      )
    )
    .orderBy(incomeEvents.expectedDate)
    .limit(1);

  let daysUntilPayday = 14;
  if (nextPayday && nextPayday.expectedDate) {
    const payDate = new Date(nextPayday.expectedDate);
    const today = new Date();
    const diffTime = payDate.getTime() - today.getTime();
    daysUntilPayday = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // 3. Daily velocity calculation
  const recommendedCap = (balanceNum / daysUntilPayday).toFixed(2);
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentSpendRes] = await db
    .select({
      total: sql<string>`COALESCE(SUM(amount), 0)`,
    })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        eq(transactionLedger.flowType, "DEBIT"),
        everydayPool ? eq(transactionLedger.poolId, everydayPool.id) : sql`1=1`,
        gte(transactionLedger.recordedAt, sevenDaysAgo)
      )
    );

  const sevenDaySpend = parseFloat(recentSpendRes?.total || "0");
  const currentDailyPace = (sevenDaySpend / 7).toFixed(2);
  const currentDailyNum = parseFloat(currentDailyPace);

  const isPaceWarning = currentDailyNum > parseFloat(recommendedCap) * 1.15 && balanceNum > 0;
  const daysOfMoneyLeft = currentDailyNum > 0 ? Math.floor(balanceNum / currentDailyNum) : daysUntilPayday;
  const shortfallDays = daysUntilPayday - daysOfMoneyLeft;

  let warningMessage: string | null = null;
  if (isPaceWarning && shortfallDays > 0) {
    warningMessage = `At your current spending pace ($${currentDailyPace}/day), your Everyday pool runs out ${shortfallDays} days before payday. Reduce daily spend to ~$${recommendedCap}/day to stay on track.`;
  }

  return {
    everydayBalance: balanceNum.toFixed(2),
    daysUntilNextPayday: daysUntilPayday,
    currentDailySpendPace: currentDailyPace,
    recommendedDailyCap: recommendedCap,
    isPaceWarning,
    warningMessage,
  };
}
