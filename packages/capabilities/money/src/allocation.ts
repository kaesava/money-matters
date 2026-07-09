import { db } from "@money-matters/db";
import { categories, financialSchedules, incomeAllocationSnapshots, transactionLedger } from "@money-matters/db/src/schema";
import { eq, and, asc, sql } from "drizzle-orm";

interface CategoryContext {
    id: string;
    priorityWeight: number;
    currentCorpus: number;
    targetAmount: number;
    daysRemaining: number;
}

/**
 * Executes the Payday Cascade Algorithm (V1).
 * Tier 1: Critical Horizon Deficits (100% funding)
 * Tier 2: Pro-Rata Sinking Velocity (Proportional distribution)
 * Tier 3: Residual Catchment (Sweep to Everyday Expenses)
 */
export async function calculatePaydayCascade(tenantId: string, appId: string, incomeAmount: number, scheduleId: string) {
   let availableFunds = incomeAmount;
   const allocationManifest: { categoryId: string; amount: number }[] = [];

   // Fetch active targets (Schedules mapped to Categories)
   // This would typically involve more complex date-math and joining against ledger for `currentCorpus`,
   // but we mock the mathematical shape based on Rule A.
   
   // Tier 1 Logic: Find categories where next payment date < next projected income date
   // [Mocked query]
   const tier1Targets: CategoryContext[] = []; // await db.query...
   for (const target of tier1Targets) {
       const deficit = Math.max(0, target.targetAmount - target.currentCorpus);
       const allocated = Math.min(availableFunds, deficit);
       if (allocated > 0) {
           allocationManifest.push({ categoryId: target.id, amount: allocated });
           availableFunds -= allocated;
       }
   }

   if (availableFunds > 0) {
       // Tier 2 Logic: Pro-Rata Sinking Velocity
       // [Mocked query]
       const tier2Targets: CategoryContext[] = []; // await db.query...
       
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
               const allocated = availableFunds * proportion;
               allocationManifest.push({ categoryId: v.id, amount: allocated });
               // We don't subtract here yet because it's a proportional split of the total available *at this point*.
           }
           availableFunds = 0; // In a real scenario we'd track exactly how much was distributed to avoid floating point dust.
       }
   }

   // Tier 3 Logic: The Residual Catchment
   if (availableFunds > 0) {
       // Find the 'everyday' category
       const everydayCat = await db.query.categories.findFirst({
           where: and(
               eq(categories.tenantId, tenantId),
               eq(categories.appId, appId),
               eq(categories.type, 'everyday')
           )
       });
       
       if (everydayCat) {
           allocationManifest.push({ categoryId: everydayCat.id, amount: availableFunds });
       }
   }

   // Save Draft Snapshot
   const [snapshot] = await db.insert(incomeAllocationSnapshots).values({
       tenantId,
       appId,
       scheduleId,
       incomeAmount: incomeAmount.toString(),
       status: 'draft',
       allocationSplitsManifest: JSON.stringify(allocationManifest),
       createdBy: tenantId,
       updatedBy: tenantId
   }).returning();

   return snapshot;
}
