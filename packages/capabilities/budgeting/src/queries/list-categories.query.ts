import { categories, categorySchedules, transactionLedger, DbOrTx } from "@money-matters/db";
import { eq, and, sql, or, ne } from "drizzle-orm";

export async function listCategoriesQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx,
  userId?: string
) {
  // 1. Fetch categories with 100% stealth privacy for PERSONAL categories
  const categoryFilters = [
    eq(categories.tenantId, tenantId),
    eq(categories.appId, appId),
    sql`${categories.archivedAt} IS NULL`,
  ];

  if (userId) {
    categoryFilters.push(
      or(ne(categories.type, "PERSONAL"), eq(categories.userId, userId))!
    );
  }

  let dbCats = await dbClient
    .select()
    .from(categories)
    .where(and(...categoryFilters));

  // Auto-seed default categories if user has 0 active categories
  if (dbCats.length === 0) {
    const defaultTemplates = [
      { name: "Groceries & Food Supplies", type: "EVERYDAY" as const, icon: "shopping-cart", colour: "#10B981", monthlyAmount: "1170.00" },
      { name: "Dining Out & Coffee", type: "EVERYDAY" as const, icon: "coffee", colour: "#F59E0B", monthlyAmount: "1040.00" },
      { name: "Petrol & Fuel", type: "EVERYDAY" as const, icon: "navigation", colour: "#3B82F6", monthlyAmount: "260.00" },
      { name: "Public Transport & Rideshare", type: "EVERYDAY" as const, icon: "truck", colour: "#8B5CF6", monthlyAmount: "180.00" },
      { name: "Personal Care & Fun", type: "EVERYDAY" as const, icon: "smile", colour: "#EC4899", monthlyAmount: "430.00" },
      { name: "Everyday Incidental Buffer", type: "EVERYDAY" as const, icon: "wallet", colour: "#00B4A6", monthlyAmount: "300.00" },
      { name: "Rent & Housing", type: "REGULAR" as const, icon: "home", colour: "#EF4444", monthlyAmount: "2400.00" },
      { name: "Electricity & Utilities", type: "REGULAR" as const, icon: "zap", colour: "#F59E0B", monthlyAmount: "300.00" },
      { name: "Emergency Reserve", type: "GOAL" as const, icon: "shield", colour: "#6366F1", monthlyAmount: null },
    ];

    try {
      await dbClient.insert(categories).values(
        defaultTemplates.map((t) => ({
          tenantId,
          appId,
          name: t.name,
          type: t.type,
          icon: t.icon,
          colour: t.colour,
          monthlyAmount: t.monthlyAmount,
          enteredAmount: t.monthlyAmount,
          budgetFrequency: "MONTHLY" as const,
          rolloverRule: "ROLLOVER" as const,
          isCommitted: false,
          createdBy: "SYSTEM",
          updatedBy: "SYSTEM",
        }))
      );

      dbCats = await dbClient
        .select()
        .from(categories)
        .where(and(...categoryFilters));
    } catch (e) {
      // Ignore conflict or insertion error
    }
  }

  // 2. Fetch category schedules
  const dbSchedules = await dbClient
    .select()
    .from(categorySchedules)
    .where(
      and(
        eq(categorySchedules.tenantId, tenantId),
        eq(categorySchedules.appId, appId),
        sql`${categorySchedules.archivedAt} IS NULL`
      )
    );

  const schedulesMap = new Map(dbSchedules.map((s) => [s.categoryId, s]));

  // 3. Compute balances from ledger credits and debits
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
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    );

  const balancesMap: Record<string, number> = {};
  for (const cat of dbCats) {
    balancesMap[cat.id] = 0;
  }
  for (const tx of txs) {
    const val = parseFloat(tx.amount);
    if (tx.flowType === "CREDIT") {
      balancesMap[tx.categoryId] = (balancesMap[tx.categoryId] || 0) + val;
    } else {
      balancesMap[tx.categoryId] = (balancesMap[tx.categoryId] || 0) - val;
    }
  }

  // 4. Determine health status and progress
  const today = new Date();
  return dbCats.map((cat) => {
    const balance = balancesMap[cat.id] || 0;
    const sched = schedulesMap.get(cat.id);
    let health: "GREEN" | "AMBER" | "RED" = "GREEN";
    let progressPct = 100;

    if (balance < 0) {
      health = "RED";
    } else if (cat.type === "REGULAR") {
      const targetAmount = sched?.targetAmount ? parseFloat(sched.targetAmount) : (cat.monthlyAmount ? parseFloat(cat.monthlyAmount) : 0);
      progressPct = targetAmount > 0 ? Math.min(100, Math.round((balance / targetAmount) * 100)) : 100;
      
      let expectedPct = 100;
      if (sched?.startDate && sched?.dueDate) {
        const start = new Date(sched.startDate).getTime();
        const end = new Date(sched.dueDate).getTime();
        const now = today.getTime();
        if (now > end) {
          expectedPct = 100;
          if (balance < targetAmount) health = "RED";
        } else if (now > start) {
          expectedPct = ((now - start) / (end - start)) * 100;
          if (progressPct < expectedPct) health = "AMBER";
          else health = "GREEN";
        } else {
          expectedPct = 0;
          health = "GREEN";
        }
      } else {
        if (balance < targetAmount) health = "AMBER";
      }
    } else if (cat.type === "GOAL" && sched) {
      const targetAmount = parseFloat(sched.targetAmount || "0");
      progressPct = targetAmount > 0 ? Math.min(100, Math.round((balance / targetAmount) * 100)) : 100;
      
      let expectedPct = 100;
      if (sched.startDate && sched.targetDate) {
        const start = new Date(sched.startDate).getTime();
        const end = new Date(sched.targetDate).getTime();
        const now = today.getTime();
        if (now > end) {
          expectedPct = 100;
          if (balance < targetAmount) health = "RED";
        } else if (now > start) {
          expectedPct = ((now - start) / (end - start)) * 100;
          if (progressPct < expectedPct) health = "AMBER";
          else health = "GREEN";
        }
      } else if (sched.targetDate) {
        const targetD = new Date(sched.targetDate);
        if (targetD.getTime() < today.getTime() && balance < targetAmount) {
          health = "RED";
        } else if (balance < targetAmount * 0.5) {
          health = "AMBER";
        }
      }
    } else {
      health = balance >= 0 ? "GREEN" : "RED";
    }

    return {
      id: cat.id,
      name: cat.name,
      type: cat.type,
      isCommitted: cat.isCommitted,
      enteredAmount: cat.enteredAmount,
      budgetFrequency: cat.budgetFrequency,
      rolloverRule: cat.rolloverRule,
      everydayTargetKeepAmount: null,
      everydaySweepFrequency: null,
      everydayAllowanceAmount: cat.everydayAllowanceAmount || null,
      monthlyAmount: cat.monthlyAmount || null,
      icon: cat.icon || null,
      colour: cat.colour || null,
      currentBalance: balance.toFixed(2),
      targetAmount: sched?.targetAmount || cat.monthlyAmount || null,
      targetDate: sched?.targetDate || sched?.dueDate || null,
      rrule: sched?.rrule || null,
      startDate: sched?.startDate || null,
      endDate: sched?.endDate || null,
      progressPercentage: progressPct,
      healthStatus: health,
    };
  });
}
