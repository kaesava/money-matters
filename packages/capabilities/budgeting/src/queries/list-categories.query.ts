import { categories, pools, bankAccounts, transactionLedger, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

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
      colour: categories.colour,
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

  // 2. Compute current month's spent amount (debits) per categoryId in Australia/Sydney timezone
  const aestDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
  const [yStr, mStr] = aestDateStr.split('-');
  const startOfMonthIso = new Date(`${yStr}-${mStr}-01T00:00:00+10:00`).toISOString();

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
      colour: cat.colour,
      isPrivate: cat.isPrivate,
      monthlySpent,
      trackingProgressPct,
    };
  });
}
