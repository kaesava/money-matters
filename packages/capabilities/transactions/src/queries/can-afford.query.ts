import { db, categories, transactionLedger, categorySchedules, incomeEvents, expenseEvents } from "@money-matters/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { CanAffordVerdictType } from "@money-matters/types";

export async function canAffordQuery(
  amount: number,
  tenantId: string,
  appId: string,
  dbClient: PgDatabase<any, any, any> = db
): Promise<CanAffordVerdictType> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]!;

  // 1. Fetch categories
  const dbCats = await dbClient
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId),
        sql`${categories.archivedAt} IS NULL`
      )
    );

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

  // 4. Calculate Everyday Pool Total
  let everydayBalance = 0;
  for (const cat of dbCats) {
    if (cat.type === "EVERYDAY") {
      everydayBalance += balancesMap[cat.id] || 0;
    }
  }

  // 5. Query upcoming paychecks to determine next payday date
  const upcomingPaychecks = await dbClient
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
    .orderBy(desc(incomeEvents.expectedDate));

  const nextPaycheck = upcomingPaychecks[upcomingPaychecks.length - 1]; // Next upcoming paycheck
  const nextPaycheckDateStr = nextPaycheck ? nextPaycheck.expectedDate : new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
  const daysUntilPayday = Math.max(1, Math.ceil((new Date(nextPaycheckDateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // 6. Query upcoming bills due before next payday
  const upcomingBills = await dbClient
    .select()
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "UPCOMING"),
        sql`${expenseEvents.expectedDate} >= ${todayStr}`,
        sql`${expenseEvents.expectedDate} <= ${nextPaycheckDateStr}`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  let billsReserved = 0;
  for (const bill of upcomingBills) {
    const cat = dbCats.find((c) => c.id === bill.categoryId);
    const catBal = cat ? (balancesMap[cat.id] || 0) : 0;
    const billAmt = parseFloat(bill.expectedAmount);
    // Deficit needed for bill
    const deficitNeeded = Math.max(0, billAmt - catBal);
    billsReserved += deficitNeeded;
  }

  const netAvailableCash = Math.max(0, everydayBalance - billsReserved);

  // Verdict 1: SAFE_YES (Available cash covers purchase AND daily pacing >= $15/day)
  if (amount <= netAvailableCash) {
    const everydayRemaining = (everydayBalance - amount).toFixed(2);
    const netRemainingAfterBills = everydayBalance - amount - billsReserved;
    const dailyPacing = (netRemainingAfterBills / daysUntilPayday).toFixed(2);
    const numDailyPacing = parseFloat(dailyPacing);

    const rationaleSteps = [
      `Available Everyday Cash: $${everydayBalance.toFixed(2)}`,
      `Reserved for Upcoming Bills (due before next pay on ${nextPaycheckDateStr}): -$${billsReserved.toFixed(2)}`,
      `Net Remaining Discretionary: $${netRemainingAfterBills.toFixed(2)}`,
      `Daily Allowance Velocity (${daysUntilPayday} days left): $${dailyPacing}/day`,
    ];

    if (numDailyPacing >= 15) {
      return {
        verdict: "SAFE_YES",
        availableCash: everydayBalance.toFixed(2),
        billsReserved: billsReserved.toFixed(2),
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
        billsReserved: billsReserved.toFixed(2),
        everydayRemaining,
        daysUntilPayday,
        dailyPacingAfterSpend: dailyPacing,
        rationaleSteps,
      };
    }
  }

  // Verdict 3: IMPACT_GOALS (Dips into uncommitted savings surplus)
  let bestSavingsId = "";
  let bestSavingsName = "";
  let bestSavingsSurplus = 0;

  for (const cat of dbCats) {
    if (cat.type === "GOAL" && !cat.isCommitted) {
      const balance = Math.max(0, balancesMap[cat.id] || 0);
      if (balance > bestSavingsSurplus) {
        bestSavingsSurplus = balance;
        bestSavingsId = cat.id;
        bestSavingsName = cat.name;
      }
    }
  }

  if (amount <= netAvailableCash + bestSavingsSurplus && bestSavingsSurplus > 0) {
    const goalSurplusUsed = (amount - netAvailableCash).toFixed(2);
    const newGoalBalance = (bestSavingsSurplus - parseFloat(goalSurplusUsed)).toFixed(2);

    return {
      verdict: "IMPACT_GOALS",
      availableCash: everydayBalance.toFixed(2),
      billsReserved: billsReserved.toFixed(2),
      affectedGoalId: bestSavingsId,
      affectedGoalName: bestSavingsName,
      goalSurplusUsed,
      newGoalBalance,
      rationaleSteps: [
        `Everyday Cash Available: $${everydayBalance.toFixed(2)}`,
        `Upcoming Bills Reserved: -$${billsReserved.toFixed(2)}`,
        `Shortfall in Everyday: -$${(amount - netAvailableCash).toFixed(2)}`,
        `Covered by uncommitted goal "${bestSavingsName}": $${goalSurplusUsed} used (new balance: $${newGoalBalance})`,
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
    billsReserved: billsReserved.toFixed(2),
    rationaleSteps: [
      `Everyday Cash Available: $${everydayBalance.toFixed(2)}`,
      `Reserved for Upcoming Bills: -$${billsReserved.toFixed(2)}`,
      `Net Available: $${netAvailableCash.toFixed(2)}`,
      `Shortfall: -$${shortfall} against purchase of $${amount.toFixed(2)}.`,
    ],
  };
}

