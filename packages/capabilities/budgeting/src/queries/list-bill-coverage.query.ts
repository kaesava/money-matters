import { envelopes, bankAccounts, incomeEvents, expenseEvents, getEnvelopeBalancesMap, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { BillCoverageResult, BillCoverageItem } from "@money-matters/types";
import { getTenantDateString } from "@money-matters/core";

export async function listBillCoverageQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  userId?: string
): Promise<BillCoverageResult> {
  let tenantRecord: { timezone: string | null } | null = null;
  if (typeof (dbClient as any).select === "function") {
    try {
      const q = dbClient.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId));
      if (typeof (q as any).limit === "function") {
        const rows = await (q as any).limit(1);
        tenantRecord = rows[0] || null;
      }
    } catch {
      // Mock db safe fallback
    }
  }
  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
  const todayStr = getTenantDateString(new Date(), { timezone: tenantTz });

  // 1. Fetch SCHEDULED_BILL envelopes with privacy filtering
  const envFilters = [
    eq(envelopes.tenantId, tenantId),
    eq(envelopes.appId, appId),
    eq(envelopes.envelopeType, "SCHEDULED_BILL"),
    sql`${envelopes.archivedAt} IS NULL`,
  ];

  const dbEnvelopes = await dbClient
    .select({
      id: envelopes.id,
      name: envelopes.name,
      monthlyAmount: envelopes.monthlyAmount,
      isPrivate: envelopes.isPrivate,
      userId: envelopes.userId,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(and(...envFilters));

  const visibleEnvelopes = userId
    ? dbEnvelopes.filter((e) => !e.isPrivate || (e.userId ? e.userId === userId : e.bankAccountUserId === userId))
    : dbEnvelopes;

  const envIds = new Set(visibleEnvelopes.map((e) => e.id));

  // Batch 1: Query balances and income events concurrently
  const [balancesMap, upcomingPaychecks] = await Promise.all([
    getEnvelopeBalancesMap(tenantId, appId, dbClient),
    dbClient
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
      .orderBy(desc(incomeEvents.expectedDate)),
  ]);

  // 2. Compute overall Bills Balance across scheduled bill envelopes
  let billsPoolBalance = 0;
  for (const envId of envIds) {
    billsPoolBalance += balancesMap[envId] || 0;
  }

  // 3. Determine next payday date
  const nextPaycheck = upcomingPaychecks[upcomingPaychecks.length - 1];
  const defaultNextPayday = getTenantDateString(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), { timezone: tenantTz });
  const nextPaydayDateStr = nextPaycheck ? nextPaycheck.expectedDate : defaultNextPayday;

  // 4. Batch 2: Fetch upcoming expense events due before next payday
  const upcomingBills = await dbClient
    .select()
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.expectedDate} >= ${todayStr}`,
        sql`${expenseEvents.expectedDate} <= ${nextPaydayDateStr}`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(expenseEvents.expectedDate));

  const eventsByEnvelopeMap = new Map<string, typeof upcomingBills>();
  let totalUpcomingBeforePayday = 0;

  for (const bill of upcomingBills) {
    if (bill.envelopeId && envIds.has(bill.envelopeId)) {
      totalUpcomingBeforePayday += parseFloat(bill.expectedAmount);
      const list = eventsByEnvelopeMap.get(bill.envelopeId) || [];
      list.push(bill);
      eventsByEnvelopeMap.set(bill.envelopeId, list);
    }
  }

  // 5. Build per-envelope bill coverage items
  const items: BillCoverageItem[] = visibleEnvelopes.map((env) => {
    const envEvents = eventsByEnvelopeMap.get(env.id) || [];
    if (envEvents.length === 0) {
      return {
        envelopeId: env.id,
        envelopeName: env.name,
        monthlyAmount: env.monthlyAmount || null,
        nextDueDate: null,
        nextDueAmount: null,
        coverageStatus: "NO_SCHEDULE",
        shortfallAmount: null,
      };
    }

    const envBalance = balancesMap[env.id] || 0;
    const envUpcomingTotal = envEvents.reduce((sum, e) => sum + parseFloat(e.expectedAmount), 0);
    const isThisCovered = envBalance >= envUpcomingTotal;
    const shortfall = Math.max(0, envUpcomingTotal - envBalance);

    const nearestEvent = envEvents[0];
    const status = isThisCovered ? "COVERED" : "SHORT_BY";
    const shortfallStr = isThisCovered ? null : shortfall.toFixed(2);

    return {
      envelopeId: env.id,
      envelopeName: env.name,
      monthlyAmount: env.monthlyAmount || null,
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
