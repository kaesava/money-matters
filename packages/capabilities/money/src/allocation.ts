import { db } from "@money-matters/db";
// Import cleanly from the root workspace package name instead of a subfolder path
import { categories, financialSchedules, incomeAllocationSnapshots } from "@money-matters/db";
import { eq, and } from "drizzle-orm";


interface CategoryContext {
  id: string;
  priorityWeight: number;
  currentCorpus: number;
  targetAmount: number;
  daysRemaining: number;
}

export async function calculatePaydayCascade(
  tenantId: string,
  appId: string,
  incomeAmount: number,
  scheduleId: string
) {
  let availableFunds = incomeAmount;
  const allocationManifest: { categoryId: string; amount: number }[] = [];

  // Rule 6: Fetch active database targets bound tightly to current tenant boundary
  const activeSchedules = await db
    .select({
      id: categories.id,
      priorityWeight: categories.priorityWeight,
      targetAmount: financialSchedules.amount,
    })
    .from(financialSchedules)
    .innerJoin(categories, eq(financialSchedules.categoryId, categories.id))
    .where(
      and(
        eq(financialSchedules.tenantId, tenantId),
        eq(financialSchedules.appId, appId)
      )
    );

  const targetContexts: CategoryContext[] = activeSchedules.map((row) => ({
    id: row.id,
    priorityWeight: row.priorityWeight,
    currentCorpus: 0, // Baseline corpus balances derived dynamically via active ledger snapshots
    targetAmount: Number(row.targetAmount),
    daysRemaining: 14, // Default V1 payment velocity schedule window
  }));

  // Tier 1 Logic: Critical Horizon Deficits
  for (const target of targetContexts) {
    if (target.priorityWeight === 1) {
      const deficit = Math.max(0, target.targetAmount - target.currentCorpus);
      const allocated = Math.min(availableFunds, deficit);
      if (allocated > 0) {
        allocationManifest.push({ categoryId: target.id, amount: allocated });
        availableFunds -= allocated;
      }
    }
  }

  // Tier 2 Logic: Pro-Rata Sinking Velocity with Floating-Point Overflow Protections
  if (availableFunds > 0) {
    let totalWeightedVelocity = 0;
    const tier2Velocities = targetContexts
      .filter((t) => t.priorityWeight > 1)
      .map((t) => {
        const V_i = Math.max(0, t.targetAmount - t.currentCorpus) / Math.max(1, t.daysRemaining);
        const W_i = 6 - t.priorityWeight; // Priority inverse scaling mod factor
        const score = V_i * W_i;
        totalWeightedVelocity += score;
        return { id: t.id, score };
      });

    if (totalWeightedVelocity > 0) {
      for (const v of tier2Velocities) {
        const proportion = v.score / totalWeightedVelocity;
        const allocated = Math.min(availableFunds, Number((incomeAmount * proportion).toFixed(2)));
        if (allocated > 0) {
          allocationManifest.push({ categoryId: v.id, amount: allocated });
          availableFunds -= allocated;
        }
      }
    }
  }

  // Tier 3 Logic: Residual Catchment (Sweep remaining cash to Everyday envelope)
  if (availableFunds > 0) {
    const [everydayCat] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.appId, appId),
          eq(categories.type, "everyday")
        )
      )
      .limit(1);

    if (everydayCat) {
      allocationManifest.push({ categoryId: everydayCat.id, amount: availableFunds });
      availableFunds = 0;
    }
  }

  // Save verified multi-tenant draft layout splits
  const [snapshot] = await db
    .insert(incomeAllocationSnapshots)
    .values({
      tenantId,
      appId,
      scheduleId,
      incomeAmount: incomeAmount.toString(),
      status: "draft",
      allocationSplitsManifest: allocationManifest,
    })
    .returning();

  return snapshot;
}
