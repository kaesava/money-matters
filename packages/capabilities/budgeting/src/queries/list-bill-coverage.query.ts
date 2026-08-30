import { pools, bankAccounts, categories, incomeEvents, expenseEvents, getPoolBalancesMap, DbOrTx } from "@money-matters/db";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { BillCoverageResult, BillCoverageItem } from "@money-matters/types";


const getAestDateString = (d: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);

export async function listBillCoverageQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  userId?: string
): Promise<BillCoverageResult> {
  const todayStr = getAestDateString();

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

  // Batch 1: Query balances, categories, and income events concurrently
  const [balancesMap, dbCats, upcomingPaychecks] = await Promise.all([
    getPoolBalancesMap(tenantId, appId, dbClient),
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
  for (const poolId of regPoolIds) {
    billsPoolBalance += balancesMap[poolId] || 0;
  }

  // 3. Determine next payday date (upcomingPaychecks sorted DESC, last item is nearest)
  const nextPaycheck = upcomingPaychecks[upcomingPaychecks.length - 1];
  const defaultNextPayday = getAestDateString(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
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

  // 5. Build per-pool / per-category bill coverage items with individual pool coverage calculations
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

    const poolBalance = balancesMap[pool.id] || 0;
    const poolUpcomingTotal = poolEvents.reduce((sum, e) => sum + parseFloat(e.expectedAmount), 0);
    const isThisPoolCovered = poolBalance >= poolUpcomingTotal;
    const poolShortfall = Math.max(0, poolUpcomingTotal - poolBalance);

    const nearestEvent = poolEvents[0];
    const cat = dbCats.find((c) => c.id === nearestEvent.categoryId);
    const status = isThisPoolCovered ? "COVERED" : "SHORT_BY";
    const shortfallStr = isThisPoolCovered ? null : poolShortfall.toFixed(2);

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

