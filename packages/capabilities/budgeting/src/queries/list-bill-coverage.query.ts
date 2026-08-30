import { pools, bankAccounts, categories, transactionLedger, incomeEvents, expenseEvents, DbOrTx } from "@money-matters/db";
import { eq, and, sql, or, desc, asc } from "drizzle-orm";
import { BillCoverageResult, BillCoverageItem } from "@money-matters/types";

export async function listBillCoverageQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  userId?: string
): Promise<BillCoverageResult> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]!;

  // 1. Fetch REGULAR pools with privacy filtering
  const poolFilters = [
    eq(pools.tenantId, tenantId),
    eq(pools.appId, appId),
    eq(pools.poolType, "REGULAR"),
    sql`${pools.archivedAt} IS NULL`,
  ];

  const dbPools = await dbClient
    .select({
      id: pools.id,
      name: pools.name,
      targetAmount: pools.targetAmount,
      isPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(pools)
    .innerJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
    .where(and(...poolFilters));

  const visiblePools = userId
    ? dbPools.filter((p) => !p.isPrivate || p.bankAccountUserId === userId)
    : dbPools;

  const regPoolIds = new Set(visiblePools.map((p) => p.id));

  // Batch 1: Query transactions, categories, and income events concurrently
  const [txs, dbCats, upcomingPaychecks] = await Promise.all([
    dbClient
      .select({
        poolId: transactionLedger.poolId,
        amount: transactionLedger.amount,
        flowType: transactionLedger.flowType,
      })
      .from(transactionLedger)
      .where(
        and(
          eq(transactionLedger.tenantId, tenantId),
          eq(transactionLedger.appId, appId),
          sql`${transactionLedger.archivedAt} IS NULL`
        )
      ),
    dbClient
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId),
          sql`${categories.archivedAt} IS NULL`
        )
      ),
    dbClient
      .select()
      .from(incomeEvents)
      .where(
        and(
          eq(incomeEvents.tenantId, tenantId),
          eq(incomeEvents.appId, appId),
          eq(incomeEvents.status, "UPCOMING"),
          sql`${incomeEvents.archivedAt} IS NULL`
        )
      )
      .orderBy(desc(incomeEvents.expectedDate)),
  ]);

  // 2. Compute overall Bills Pool Balance across regular pools
  let billsPoolBalance = 0;
  for (const tx of txs) {
    if (tx.poolId && regPoolIds.has(tx.poolId)) {
      const val = parseFloat(tx.amount);
      if (tx.flowType === "CREDIT") {
        billsPoolBalance += val;
      } else {
        billsPoolBalance -= val;
      }
    }
  }

  // 3. Determine next payday date
  const nextPaycheck = upcomingPaychecks[upcomingPaychecks.length - 1];
  const defaultNextPayday = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;
  const nextPaydayDateStr = nextPaycheck ? nextPaycheck.expectedDate : defaultNextPayday;

  // 4. Batch 2: Fetch upcoming expense events due before next payday for REGULAR pools
  const upcomingBills = await dbClient
    .select()
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "UPCOMING"),
        sql`${expenseEvents.expectedDate} >= ${todayStr}`,
        sql`${expenseEvents.expectedDate} <= ${nextPaydayDateStr}`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(expenseEvents.expectedDate));

  const eventsByPoolMap = new Map<string, typeof upcomingBills>();
  let totalUpcomingBeforePayday = 0;

  for (const bill of upcomingBills) {
    if (bill.poolId && regPoolIds.has(bill.poolId)) {
      totalUpcomingBeforePayday += parseFloat(bill.expectedAmount);
      const list = eventsByPoolMap.get(bill.poolId) || [];
      list.push(bill);
      eventsByPoolMap.set(bill.poolId, list);
    }
  }

  const poolShortfall = Math.max(0, totalUpcomingBeforePayday - billsPoolBalance);
  const isPoolCovered = billsPoolBalance >= totalUpcomingBeforePayday;

  // 5. Build per-pool / per-category bill coverage items
  const items: BillCoverageItem[] = visiblePools.map((pool) => {
    const poolEvents = eventsByPoolMap.get(pool.id) || [];
    if (poolEvents.length === 0) {
      return {
        poolId: pool.id,
        poolName: pool.name,
        monthlyAmount: pool.targetAmount || null,
        nextDueDate: null,
        nextDueAmount: null,
        coverageStatus: "NO_SCHEDULE",
        shortfallAmount: null,
      };
    }

    const nearestEvent = poolEvents[0];
    const cat = dbCats.find((c) => c.id === nearestEvent.categoryId);
    const status = isPoolCovered ? "COVERED" : "SHORT_BY";
    const shortfallStr = isPoolCovered ? null : poolShortfall.toFixed(2);

    return {
      poolId: pool.id,
      poolName: pool.name,
      categoryId: cat?.id,
      categoryName: cat?.name,
      monthlyAmount: pool.targetAmount || null,
      nextDueDate: nearestEvent.expectedDate,
      nextDueAmount: nearestEvent.expectedAmount,
      coverageStatus: status,
      shortfallAmount: shortfallStr,
    };
  });

  return {
    billsPoolBalance,
    totalUpcomingBeforePayday,
    nextPaydayDate: nextPaydayDateStr,
    items,
  };
}
