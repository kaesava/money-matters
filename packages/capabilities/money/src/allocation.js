"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePaydayCascade = calculatePaydayCascade;
const db_1 = require("@money-matters/db");
const schema_1 = require("@money-matters/db/src/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Executes the Payday Cascade Algorithm (V1).
 * Tier 1: Critical Horizon Deficits (100% funding)
 * Tier 2: Pro-Rata Sinking Velocity (Proportional distribution)
 * Tier 3: Residual Catchment (Sweep to Everyday Expenses)
 */
async function calculatePaydayCascade(tenantId, appId, incomeAmount, scheduleId) {
    let availableFunds = incomeAmount;
    const allocationManifest = [];
    // Fetch active targets (Schedules mapped to Categories)
    // This would typically involve more complex date-math and joining against ledger for `currentCorpus`,
    // but we mock the mathematical shape based on Rule A.
    // Tier 1 Logic: Find categories where next payment date < next projected income date
    // [Mocked query]
    const tier1Targets = []; // await db.query...
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
        const tier2Targets = []; // await db.query...
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
        const everydayCat = await db_1.db.query.categories.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.categories.appId, appId), (0, drizzle_orm_1.eq)(schema_1.categories.type, 'everyday'))
        });
        if (everydayCat) {
            allocationManifest.push({ categoryId: everydayCat.id, amount: availableFunds });
        }
    }
    // Save Draft Snapshot
    const [snapshot] = await db_1.db.insert(schema_1.incomeAllocationSnapshots).values({
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
//# sourceMappingURL=allocation.js.map