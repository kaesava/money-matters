import { DbOrTx, allocationStrategies, allocationStrategySteps } from "@money-matters/db";
import { AllocationStepType, detectMatchingAllocationPreset } from "@money-matters/types";
import { eq, and, sql } from "drizzle-orm";

export interface StrategyStepInputItem {
  id?: string;
  orderIndex: number;
  stepType: AllocationStepType;
  targetEnvelopeId?: string | null;
  config?: Record<string, unknown> | null;
}

export async function updateAllocationStrategyStepsCommand(
  tenantId: string,
  appId: string,
  userId: string,
  strategyId: string,
  steps: StrategyStepInputItem[],
  dbClient: DbOrTx
) {
  const [strategy] = await dbClient
    .select()
    .from(allocationStrategies)
    .where(
      and(
        eq(allocationStrategies.id, strategyId),
        eq(allocationStrategies.tenantId, tenantId),
        eq(allocationStrategies.appId, appId),
        sql`${allocationStrategies.archivedAt} IS NULL`
      )
    )
    .limit(1);

  if (!strategy) {
    throw new Error("Allocation strategy not found.");
  }

  return await dbClient.transaction(async (tx) => {
    // Pin SURPLUS_SWEEP as the final step so it never starves downstream steps
    const nonSweepSteps = steps.filter((s) => s.stepType !== "SURPLUS_SWEEP");
    const sweepSteps = steps.filter((s) => s.stepType === "SURPLUS_SWEEP");
    const orderedSteps = [...nonSweepSteps, ...sweepSteps];

    const matchedPreset = detectMatchingAllocationPreset(orderedSteps);
    const resolvedPresetKey = matchedPreset ?? "CUSTOM";
    const resolvedName = strategy.isPrivate
      ? resolvedPresetKey === "BALANCED" ? "Personal Balanced"
        : resolvedPresetKey === "BILLS_FORTRESS" ? "Personal Bills Fortress"
        : resolvedPresetKey === "PAY_YOURSELF_FIRST" ? "Personal Pay Yourself First"
        : "Personal Custom Rules"
      : resolvedPresetKey === "BALANCED" ? "Standard Balanced"
        : resolvedPresetKey === "BILLS_FORTRESS" ? "Bills Fortress"
        : resolvedPresetKey === "PAY_YOURSELF_FIRST" ? "Pay Yourself First"
        : "Custom Rules";

    // Set presetKey to matched canonical preset or CUSTOM
    await tx
      .update(allocationStrategies)
      .set({
        presetKey: resolvedPresetKey,
        name: resolvedName,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(allocationStrategies.id, strategyId));

    // Archive all existing steps for this strategy
    await tx
      .update(allocationStrategySteps)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(allocationStrategySteps.strategyId, strategyId),
          eq(allocationStrategySteps.tenantId, tenantId),
          sql`${allocationStrategySteps.archivedAt} IS NULL`
        )
      );

    // Insert new steps in bulk
    const rowsToInsert = orderedSteps.map((s, idx) => ({
      tenantId,
      appId,
      strategyId,
      orderIndex: idx,
      stepType: s.stepType,
      targetEnvelopeId: s.targetEnvelopeId || null,
      config: s.config || null,
      createdBy: userId,
      updatedBy: userId,
    }));

    const insertedSteps = rowsToInsert.length > 0
      ? await tx.insert(allocationStrategySteps).values(rowsToInsert).returning()
      : [];

    return {
      strategyId,
      presetKey: resolvedPresetKey,
      steps: insertedSteps,
    };
  });
}
