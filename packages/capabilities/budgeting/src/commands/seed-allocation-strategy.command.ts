import { DbOrTx, allocationStrategies, allocationStrategySteps } from "@money-matters/db";
import { CANONICAL_ALLOCATION_PRESETS } from "@money-matters/types";
import { eq, and, sql } from "drizzle-orm";

export async function seedDefaultAllocationStrategy(
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx,
  isPrivate = false
) {
  const conditions = [
    eq(allocationStrategies.tenantId, tenantId),
    eq(allocationStrategies.appId, appId),
    eq(allocationStrategies.isPrivate, isPrivate),
    sql`${allocationStrategies.archivedAt} IS NULL`,
  ];
  if (isPrivate && userId) {
    conditions.push(eq(allocationStrategies.userId, userId));
  }

  // Check if active strategy already exists
  const [existing] = await dbClient
    .select()
    .from(allocationStrategies)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [strategy] = await dbClient
    .insert(allocationStrategies)
    .values({
      tenantId,
      appId,
      name: isPrivate ? "Personal Balanced" : "Standard Balanced",
      presetKey: "BALANCED",
      description: isPrivate
        ? "Personal bills due soon and personal spending are protected first, followed by private savings goals."
        : "Bills due soon and everyday living are protected first, followed by upcoming bills and savings goals.",
      isDefault: true,
      isPrivate,
      userId: isPrivate ? userId : null,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const canonicalSteps = CANONICAL_ALLOCATION_PRESETS.BALANCED.steps;
  const stepRows = canonicalSteps.map((step, idx) => ({
    tenantId,
    appId,
    strategyId: strategy.id,
    orderIndex: idx,
    stepType: step.stepType,
    createdBy: userId,
    updatedBy: userId,
  }));

  await dbClient.insert(allocationStrategySteps).values(stepRows);
  return strategy;
}
