import { DbOrTx, allocationStrategies, allocationStrategySteps } from "@money-matters/db";
import { CANONICAL_ALLOCATION_PRESETS, AllocationPresetKey } from "@money-matters/types";
import { eq, and, sql } from "drizzle-orm";
import { seedDefaultAllocationStrategy } from "./seed-allocation-strategy.command.js";

export async function applyAllocationPresetCommand(
  tenantId: string,
  appId: string,
  userId: string,
  presetKey: "BALANCED" | "BILLS_FORTRESS" | "PAY_YOURSELF_FIRST",
  dbClient: DbOrTx
) {
  const preset = CANONICAL_ALLOCATION_PRESETS[presetKey];
  if (!preset) {
    throw new Error(`Invalid preset key: ${presetKey}`);
  }

  let [strategy] = await dbClient
    .select()
    .from(allocationStrategies)
    .where(
      and(
        eq(allocationStrategies.tenantId, tenantId),
        eq(allocationStrategies.appId, appId),
        eq(allocationStrategies.isDefault, true),
        sql`${allocationStrategies.archivedAt} IS NULL`
      )
    )
    .limit(1);

  if (!strategy) {
    strategy = await seedDefaultAllocationStrategy(tenantId, appId, userId, dbClient);
  }

  return await dbClient.transaction(async (tx) => {
    // 1. Update strategy presetKey
    const [updatedStrategy] = await tx
      .update(allocationStrategies)
      .set({
        presetKey,
        name: presetKey === "BALANCED" ? "Standard Balanced" : presetKey === "BILLS_FORTRESS" ? "Bills Fortress" : "Pay Yourself First",
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(allocationStrategies.id, strategy.id))
      .returning();

    // 2. Soft-delete old steps
    await tx
      .update(allocationStrategySteps)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(allocationStrategySteps.strategyId, strategy.id),
          eq(allocationStrategySteps.tenantId, tenantId),
          sql`${allocationStrategySteps.archivedAt} IS NULL`
        )
      );

    // 3. Insert canonical steps
    const newStepRows = preset.steps.map((step, idx) => ({
      tenantId,
      appId,
      strategyId: strategy.id,
      orderIndex: idx,
      stepType: step.stepType,
      config: step.config || null,
      createdBy: userId,
      updatedBy: userId,
    }));

    const insertedSteps = await tx.insert(allocationStrategySteps).values(newStepRows).returning();

    return {
      ...updatedStrategy,
      steps: insertedSteps,
    };
  });
}
