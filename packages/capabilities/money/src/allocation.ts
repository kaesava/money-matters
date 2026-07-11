import { db, categories, categorySchedules, allocationPlans, allocationPlanLines, shortfallEvents, transactionLedger, incomeEvents } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

interface EngineCategory {
  id: string;
  name: string;
  type: "MAJOR" | "RECURRING" | "EVERYDAY";
  priorityRank: number | null;
  isDefaultExcess: boolean;
  targetAmount: number;
  currentBalance: number;
  dueDate: string | null;
  nextDueDate: string | null;
  rrule: string | null;
}

export async function calculatePaydayCascade(
  tenantId: string,
  appId: string,
  incomeAmount: number,
  incomeEventId: string
) {
  // Step 1: Fetch all categories for this household
  const dbCategories = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId),
        sql`${categories.archivedAt} IS NULL`
      )
    );

  // Step 2: Fetch Category Schedules (targets)
  const dbSchedules = await db
    .select()
    .from(categorySchedules)
    .where(
      and(
        eq(categorySchedules.tenantId, tenantId),
        eq(categorySchedules.appId, appId),
        sql`${categorySchedules.archivedAt} IS NULL`
      )
    );

  // Step 3: Fetch Open Shortfalls to calculate outstanding repayments
  const dbShortfalls = await db
    .select()
    .from(shortfallEvents)
    .where(
      and(
        eq(shortfallEvents.tenantId, tenantId),
        eq(shortfallEvents.appId, appId),
        eq(shortfallEvents.status, "BORROWED"),
        sql`${shortfallEvents.archivedAt} IS NULL`
      )
    );

  // Step 4: Fetch transaction ledgers to calculate current balances
  const dbTransactions = await db
    .select({
      categoryId: transactionLedger.categoryId,
      amount: transactionLedger.amount,
      flowType: transactionLedger.flowType
    })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    );

  // Compute current category balances from ledger
  const categoryBalances: Record<string, number> = {};
  for (const cat of dbCategories) {
    categoryBalances[cat.id] = 0;
  }
  for (const tx of dbTransactions) {
    const amt = parseFloat(tx.amount);
    if (tx.flowType === "CREDIT") {
      categoryBalances[tx.categoryId] = (categoryBalances[tx.categoryId] || 0) + amt;
    } else {
      categoryBalances[tx.categoryId] = (categoryBalances[tx.categoryId] || 0) - amt;
    }
  }

  // Map schedules to categories
  const schedulesMap: Record<string, typeof dbSchedules[0]> = {};
  for (const sched of dbSchedules) {
    schedulesMap[sched.categoryId] = sched;
  }

  // Pre-calculate shortfall repayments to add to donor category gaps
  const shortfallRepaymentsByDonor: Record<string, number> = {};
  for (const sf of dbShortfalls) {
    const borrowed = parseFloat(sf.borrowedAmount);
    const repaid = parseFloat(sf.repaidAmount);
    const remaining = borrowed - repaid;
    if (remaining > 0) {
      shortfallRepaymentsByDonor[sf.donorCategoryId] = (shortfallRepaymentsByDonor[sf.donorCategoryId] || 0) + remaining;
    }
  }

  // Fetch target income event expected date to compute paychecks remaining
  const [event] = await db
    .select()
    .from(incomeEvents)
    .where(eq(incomeEvents.id, incomeEventId));
  const paydayDate = event ? new Date(event.expectedDate) : new Date();

  // Normalize engine categories list
  const engineCategories: EngineCategory[] = dbCategories.map(cat => {
    const sched = schedulesMap[cat.id];
    const targetAmount = sched ? parseFloat(sched.targetAmount) : 0;
    const currentBalance = categoryBalances[cat.id] || 0;
    return {
      id: cat.id,
      name: cat.name,
      type: cat.type as "MAJOR" | "RECURRING" | "EVERYDAY",
      priorityRank: cat.priorityRank,
      isDefaultExcess: cat.isDefaultExcess,
      targetAmount,
      currentBalance,
      dueDate: sched?.dueDate || null,
      nextDueDate: sched?.nextDueDate || null,
      rrule: sched?.rrule || null
    };
  });

  // Calculate Paychecks remaining helper
  const getPaychecksRemaining = (cat: EngineCategory): number => {
    if (!cat.dueDate && !cat.nextDueDate) return 1;
    const targetDate = new Date(cat.nextDueDate || cat.dueDate!);
    const diffMs = targetDate.getTime() - paydayDate.getTime();
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    
    // Fortnightly default is 14 days frequency
    const intervalDays = 14; 
    return Math.max(1, Math.ceil(diffDays / intervalDays));
  };

  let remainingFunds = incomeAmount;
  const allocations: Record<string, { proposed: number; reasoning: string; isRepayment: boolean }> = {};

  // Step 0: Outstanding Shortfall Repayments
  // Add outstanding repayments to donor categories' gaps
  for (const cat of engineCategories) {
    const repaymentNeeded = shortfallRepaymentsByDonor[cat.id] || 0;
    if (repaymentNeeded > 0) {
      // Calculate how much we can fund for shortfall repayments
      const proposedRepayment = Math.min(remainingFunds, repaymentNeeded);
      remainingFunds -= proposedRepayment;
      allocations[cat.id] = {
        proposed: proposedRepayment,
        reasoning: `Shortfall recovery repayment: $${proposedRepayment.toFixed(2)} proposed to cover debt.`,
        isRepayment: true
      };
    }
  }

  // Step 1: Tier 1 (Priority Rank = 1)
  const tier1Categories = engineCategories.filter(c => c.type !== "EVERYDAY" && c.priorityRank === 1);
  if (tier1Categories.length > 0) {
    const tier1Gaps = tier1Categories.map(cat => {
      const remainingPaychecks = getPaychecksRemaining(cat);
      const categoryGap = Math.max(0, cat.targetAmount - cat.currentBalance);
      const proposedAllocation = categoryGap / remainingPaychecks;
      return { cat, proposedAllocation };
    });

    const totalTier1Needed = tier1Gaps.reduce((sum, item) => sum + item.proposedAllocation, 0);

    if (remainingFunds >= totalTier1Needed) {
      // Fully fund Tier 1
      for (const item of tier1Gaps) {
        remainingFunds -= item.proposedAllocation;
        const currentProposed = (allocations[item.cat.id]?.proposed || 0) + item.proposedAllocation;
        allocations[item.cat.id] = {
          proposed: currentProposed,
          reasoning: allocations[item.cat.id]?.reasoning 
            ? allocations[item.cat.id].reasoning + ` Priority 1 allocation: $${item.proposedAllocation.toFixed(2)}.`
            : `Priority 1 allocation: $${item.proposedAllocation.toFixed(2)} calculated based on target.`,
          isRepayment: allocations[item.cat.id]?.isRepayment || false
        };
      }
    } else {
      // Pro-rata partial funding across Tier 1
      const scale = remainingFunds / totalTier1Needed;
      for (const item of tier1Gaps) {
        const partialAmt = item.proposedAllocation * scale;
        const currentProposed = (allocations[item.cat.id]?.proposed || 0) + partialAmt;
        allocations[item.cat.id] = {
          proposed: currentProposed,
          reasoning: allocations[item.cat.id]?.reasoning
            ? allocations[item.cat.id].reasoning + ` Pro-rata partial Priority 1 funding: $${partialAmt.toFixed(2)} due to insufficient funds.`
            : `Insufficient income. Pro-rata partial Priority 1 funding: $${partialAmt.toFixed(2)} allocated.`,
          isRepayment: allocations[item.cat.id]?.isRepayment || false
        };
      }
      remainingFunds = 0;
    }
  }

  // Step 2: Tier 2 (Subsequent Priority ranks sequential)
  if (remainingFunds > 0) {
    // Find all distinct priority ranks sorted from high (rank 2) to low
    const otherPriorityRanks = Array.from(new Set(engineCategories.map(c => c.priorityRank)))
      .filter((r): r is number => r !== null && r > 1)
      .sort((a, b) => a - b);

    for (const rank of otherPriorityRanks) {
      if (remainingFunds <= 0) break;
      const rankCategories = engineCategories.filter(c => c.type !== "EVERYDAY" && c.priorityRank === rank);
      
      const rankGaps = rankCategories.map(cat => {
        const remainingPaychecks = getPaychecksRemaining(cat);
        const categoryGap = Math.max(0, cat.targetAmount - cat.currentBalance);
        const proposedAllocation = categoryGap / remainingPaychecks;
        return { cat, proposedAllocation };
      });

      const totalRankNeeded = rankGaps.reduce((sum, item) => sum + item.proposedAllocation, 0);

      if (remainingFunds >= totalRankNeeded) {
        // Fully fund this rank
        for (const item of rankGaps) {
          remainingFunds -= item.proposedAllocation;
          const currentProposed = (allocations[item.cat.id]?.proposed || 0) + item.proposedAllocation;
          allocations[item.cat.id] = {
            proposed: currentProposed,
            reasoning: allocations[item.cat.id]?.reasoning 
              ? allocations[item.cat.id].reasoning + ` Priority ${rank} allocation: $${item.proposedAllocation.toFixed(2)}.`
              : `Priority ${rank} allocation: $${item.proposedAllocation.toFixed(2)} calculated based on target.`,
            isRepayment: allocations[item.cat.id]?.isRepayment || false
          };
        }
      } else {
        // Pro-rata partial funding for this rank
        const scale = remainingFunds / totalRankNeeded;
        for (const item of rankGaps) {
          const partialAmt = item.proposedAllocation * scale;
          const currentProposed = (allocations[item.cat.id]?.proposed || 0) + partialAmt;
          allocations[item.cat.id] = {
            proposed: currentProposed,
            reasoning: allocations[item.cat.id]?.reasoning
              ? allocations[item.cat.id].reasoning + ` Pro-rata partial Priority ${rank} funding: $${partialAmt.toFixed(2)}.`
              : `Pro-rata partial Priority ${rank} funding: $${partialAmt.toFixed(2)} allocated.`,
            isRepayment: allocations[item.cat.id]?.isRepayment || false
          };
        }
        remainingFunds = 0;
      }
    }
  }

  // Step 3: Tier 3 (EVERYDAY / default excess category sweep)
  if (remainingFunds > 0) {
    const defaultExcessCat = engineCategories.find(c => c.isDefaultExcess);
    if (defaultExcessCat) {
      const currentProposed = (allocations[defaultExcessCat.id]?.proposed || 0) + remainingFunds;
      allocations[defaultExcessCat.id] = {
        proposed: currentProposed,
        reasoning: allocations[defaultExcessCat.id]?.reasoning
          ? allocations[defaultExcessCat.id].reasoning + ` Swept residual excess: $${remainingFunds.toFixed(2)}.`
          : `Swept residual excess: $${remainingFunds.toFixed(2)} allocated to default excess bucket.`,
        isRepayment: allocations[defaultExcessCat.id]?.isRepayment || false
      };
      remainingFunds = 0;
    }
  }

  // Insert Draft Allocation Plan inside transaction boundaries
  const plan = await db.transaction(async (tx) => {
    const [insertedPlan] = await tx
      .insert(allocationPlans)
      .values({
        tenantId,
        appId,
        incomeEventId,
        status: "DRAFT",
        totalIncomeAmount: incomeAmount.toFixed(2),
        createdBy: "00000000-0000-0000-0000-000000000000",
        updatedBy: "00000000-0000-0000-0000-000000000000"
      })
      .returning();

    // Insert allocation plan lines for all configured categories
    for (const cat of engineCategories) {
      const alloc = allocations[cat.id] || { proposed: 0, reasoning: "No target scheduled for this payday.", isRepayment: false };
      await tx
        .insert(allocationPlanLines)
        .values({
          tenantId,
          appId,
          planId: insertedPlan.id,
          categoryId: cat.id,
          proposedAmount: alloc.proposed.toFixed(2),
          confirmedAmount: null,
          reasoning: alloc.reasoning,
          isShortfallRepayment: alloc.isRepayment,
          createdBy: "00000000-0000-0000-0000-000000000000",
          updatedBy: "00000000-0000-0000-0000-000000000000"
        });
    }

    return insertedPlan;
  });

  return plan;
}
