import { db } from "@money-matters/db";
import { incomeAllocationSnapshots, categories } from "@money-matters/db/src/schema";
import { and, eq } from "drizzle-orm";

interface CategoryContext {
  id: string;
  priorityWeight: number;
  currentCorpus: number;
  targetAmount: number;
  daysRemaining: number;
}

export async function calculatePaydayCascade(tenantId: string, appId: string, incomeAmount: number, scheduleId: string) {
  let availableFunds = incomeAmount;
  const allocationManifest: { categoryId: string; amount: number }[] = [];

  // Tier 1 Logic: Critical Horizon Deficits
  const tier1Targets: CategoryContext[] = []; 
  for (const target of tier1Targets) {
    const deficit = Math.max(0, target.targetAmount - target.currentCorpus);
    const allocated = Math.min(availableFunds, deficit);
    if (allocated > 0) {
      allocationManifest.push({ categoryId: target.id, amount: allocated });
      availableFunds -= allocated;
    }
  }

  // Tier 2 Logic: Pro-Rata Sinking Velocity (Proportional Priority Distribution)
  if (availableFunds > 0) {
    const tier2Targets: CategoryContext[] = []; 
    let totalWeightedVelocity = 0;
    
    const velocities = tier2Targets.map(t => {
      const V_i = Math.max(0, t.targetAmount - t.currentCorpus) / Math.max(1, t.daysRemaining);
      const W_i = 6 - t.priorityWeight;
      const score = V_i * W_i;
      totalWeightedVelocity += score;
      return { id: t.id, score };
    });

    if (totalWeightedVelocity > 0) {
      for (const v of velocities) {
        const proportion = v.score / totalWeightedVelocity;
        const allocated = Math.min(availableFunds, incomeAmount * proportion);
        if (allocated > 0) {
          allocationManifest.push({ categoryId: v.id, amount: allocated });
          availableFunds -= allocated;
        }
      }
    }
  }

  // Tier 3 Logic: Residual Catchment
  if (availableFunds > 0) {
    const [everydayCat] = await db.select().from(categories).where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId),
        eq(categories.type, "everyday")
      )
    ).limit(1);
    
    if (everydayCat) {
      allocationManifest.push({ categoryId: everydayCat.id, amount: availableFunds });
      availableFunds = 0;
    }
  }

  const [snapshot] = await db.insert(incomeAllocationSnapshots).values({
    tenantId,
    appId,
    scheduleId,
    incomeAmount: incomeAmount.toString(),
    status: "draft",
    allocationSplitsManifest: allocationManifest,
    createdBy: tenantId,
    updatedBy: tenantId
  }).returning();

  return snapshot;
}
