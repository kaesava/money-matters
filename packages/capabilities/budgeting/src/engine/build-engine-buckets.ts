import { pools, categories, bankAccounts } from "@money-matters/db";
import { EngineBucket, BucketType } from "./allocation-engine.js";

interface DbPoolRecord {
  id: string;
  name: string;
  poolType: BucketType;
  goalMode?: "TARGET_DATE" | "ONGOING" | null;
  targetAmount?: string | number | null;
  targetDate?: string | null;
  everydayAllowanceAmount?: string | number | null;
  safetyBufferFloor?: string | number | null;
  isCommitted?: boolean | null;
  isSurplusTarget?: boolean | null;
  bankAccountId?: string | null;
}

interface DbCategoryRecord {
  id: string;
  poolId: string;
  monthlyAmount?: string | number | null;
  isEssential?: boolean | null;
  startDate?: string | null;
}

export function buildEngineBuckets(
  dbPools: DbPoolRecord[],
  dbCategories: DbCategoryRecord[],
  poolBalancesMap: Record<string, number>,
  bankAccountsMap?: Record<string, { userId?: string | null; isPrivate?: boolean | null }>
): EngineBucket[] {
  return dbPools.map((p) => {
    const poolCats = dbCategories.filter((c) => c.poolId === p.id);
    const hasEssentialCat = poolCats.some((c) => c.isEssential);

    let monthlyTarget = p.targetAmount ? parseFloat(String(p.targetAmount)) : null;
    if (p.poolType === "REGULAR") {
      const sumCatMonthly = poolCats.reduce((acc, c) => acc + (c.monthlyAmount ? parseFloat(String(c.monthlyAmount)) : 0), 0);
      monthlyTarget = sumCatMonthly > 0 ? sumCatMonthly : monthlyTarget;
    }

    const acc = p.bankAccountId && bankAccountsMap ? bankAccountsMap[p.bankAccountId] : undefined;

    return {
      id: p.id,
      name: p.name,
      type: p.poolType,
      userId: acc?.userId ?? undefined,
      isPrivate: acc?.isPrivate ?? false,
      isEssential: hasEssentialCat,
      isCommitted: p.isCommitted ?? false,
      isSurplusTarget: p.isSurplusTarget ?? false,
      monthlyAmount: monthlyTarget,
      targetAmount: p.targetAmount ? parseFloat(String(p.targetAmount)) : null,
      everydayAllowanceAmount: p.everydayAllowanceAmount ? parseFloat(String(p.everydayAllowanceAmount)) : null,
      safetyBufferFloor: p.safetyBufferFloor ? parseFloat(String(p.safetyBufferFloor)) : null,
      goalMode: p.goalMode ?? (p.poolType === "GOAL" ? "TARGET_DATE" : undefined),
      targetDate: p.targetDate ?? null,
      currentBalance: poolBalancesMap[p.id] ?? 0,
    };
  });
}
