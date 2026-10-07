import { categories, pools, bankAccounts, transactionLedger, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { getTenantDateString } from "@money-matters/core";

export async function listCategoriesQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  userId?: string
) {
  // 1. Fetch categories joined with pools and bankAccounts for stealth privacy
  const dbCats = await dbClient
    .select({
      id: categories.id,
      poolId: categories.poolId,
      name: categories.name,
      monthlyAmount: categories.monthlyAmount,
      enteredAmount: categories.enteredAmount,
      budgetFrequency: categories.budgetFrequency,
      isEssential: categories.isEssential,
      icon: categories.icon,
      poolType: pools.poolType,
      isPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(categories)
    .innerJoin(pools, eq(categories.poolId, pools.id))
    .innerJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId),
        sql`${categories.archivedAt} IS NULL`
      )
    );

  const visibleCats = userId
    ? dbCats.filter((c) => !c.isPrivate || c.bankAccountUserId === userId)
    : dbCats;

  // 2. Resolve tenant accounting timezone and compute current month's spent amount (debits) per categoryId
  const [tenantRecord] = await dbClient
    .select({ timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
  const tenantDateStr = getTenantDateString(new Date(), { timezone: tenantTz });
  const [yStr, mStr] = tenantDateStr.split('-');

  // Calculate midnight of the 1st of the current month in the tenant accounting timezone
  // Midday UTC on the 1st of month:
  const middayUtc = new Date(Date.UTC(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1, 12, 0, 0));
  // Format in tenant timezone to get local day components
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tenantTz,
    timeZoneName: 'shortOffset',
  }).formatToParts(middayUtc);
  const tzOffsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+10';
  // Normalize GMT+10 or GMT-5 to +10:00 or -05:00
  let offsetIso = '+10:00';
  const offsetMatch = tzOffsetPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (offsetMatch) {
    const sign = offsetMatch[1];
    const hours = offsetMatch[2].padStart(2, '0');
    const mins = (offsetMatch[3] || '00').padStart(2, '0');
    offsetIso = `${sign}${hours}:${mins}`;
  }
  const startOfMonthIso = new Date(`${yStr}-${mStr}-01T00:00:00${offsetIso}`).toISOString();

  const txs = await dbClient
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
        sql`${transactionLedger.recordedAt} >= ${startOfMonthIso}::timestamptz`,
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    );


  const spentMap: Record<string, number> = {};
  for (const cat of visibleCats) {
    spentMap[cat.id] = 0;
  }
  for (const tx of txs) {
    if (!tx.categoryId) continue;
    if (tx.flowType === "DEBIT") {
      spentMap[tx.categoryId] = (spentMap[tx.categoryId] || 0) + parseFloat(tx.amount);
    }
  }

  return visibleCats.map((cat) => {
    const monthlySpent = spentMap[cat.id] || 0;
    const monthlyTarget = cat.monthlyAmount ? parseFloat(cat.monthlyAmount) : 0;
    const trackingProgressPct = monthlyTarget > 0 ? Math.min(100, Math.round((monthlySpent / monthlyTarget) * 100)) : 0;

    return {
      id: cat.id,
      poolId: cat.poolId,
      name: cat.name,
      poolType: cat.poolType,
      monthlyAmount: cat.monthlyAmount,
      enteredAmount: cat.enteredAmount,
      budgetFrequency: cat.budgetFrequency,
      isEssential: cat.isEssential,
      icon: cat.icon,
      isPrivate: cat.isPrivate,
      monthlySpent,
      trackingProgressPct,
    };
  });
}
