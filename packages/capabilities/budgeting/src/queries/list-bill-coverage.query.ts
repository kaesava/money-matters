import { categories, transactionLedger, incomeEvents, expenseEvents, DbOrTx } from "@money-matters/db";
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

  // 1. Fetch REGULAR categories with privacy filtering
  const categoryFilters = [
    eq(categories.tenantId, tenantId),
    eq(categories.appId, appId),
    eq(categories.type, "REGULAR"),
    sql`${categories.archivedAt} IS NULL`,
  ];

  if (userId) {
    categoryFilters.push(
      or(eq(categories.isPrivate, false), eq(categories.userId, userId))!
    );
  }

  // Batch 1: Query categories, ledger transactions, and income events concurrently
  const [dbCats, txs, upcomingPaychecks] = await Promise.all([
    dbClient
      .select()
      .from(categories)
      .where(and(...categoryFilters)),
    dbClient
      .select({
        categoryId: transactionLedger.categoryId,
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

  // 2. Compute overall Bills Pool Balance
  const regCatIds = new Set(dbCats.map((c) => c.id));
  let billsPoolBalance = 0;

  for (const tx of txs) {
    if (regCatIds.has(tx.categoryId)) {
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

  // 4. Batch 2: Fetch upcoming expense events due before next payday for REGULAR categories
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

  // Map upcoming events by categoryId
  const eventsByCatMap = new Map<string, typeof upcomingBills>();
  let totalUpcomingBeforePayday = 0;

  for (const bill of upcomingBills) {
    if (bill.categoryId && regCatIds.has(bill.categoryId)) {
      totalUpcomingBeforePayday += parseFloat(bill.expectedAmount);
      const list = eventsByCatMap.get(bill.categoryId) || [];
      list.push(bill);
      eventsByCatMap.set(bill.categoryId, list);
    }
  }

  const poolShortfall = Math.max(0, totalUpcomingBeforePayday - billsPoolBalance);
  const isPoolCovered = billsPoolBalance >= totalUpcomingBeforePayday;

  // 5. Build per-category bill coverage items
  const items: BillCoverageItem[] = dbCats.map((cat) => {
    const catEvents = eventsByCatMap.get(cat.id) || [];
    if (catEvents.length === 0) {
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        monthlyAmount: cat.monthlyAmount || null,
        nextDueDate: null,
        nextDueAmount: null,
        coverageStatus: "NO_SCHEDULE",
        shortfallAmount: null,
      };
    }

    const nearestEvent = catEvents[0];
    const status = isPoolCovered ? "COVERED" : "SHORT_BY";
    const shortfallStr = isPoolCovered ? null : poolShortfall.toFixed(2);

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      monthlyAmount: cat.monthlyAmount || null,
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
