import { DbOrTx, allocationStrategies, allocationStrategySteps, envelopes } from "@money-matters/db";
import { eq, and, sql, asc } from "drizzle-orm";
import { seedDefaultAllocationStrategy } from "../commands/seed-allocation-strategy.command.js";

export async function getActiveAllocationStrategyQuery(
  tenantId: string,
  appId: string,
  userId: string | undefined,
  dbClient: DbOrTx
) {
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
    // Fallback: seed on demand if not present
    await seedDefaultAllocationStrategy(tenantId, appId, userId || "system", dbClient);
    const [seeded] = await dbClient
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
    strategy = seeded;
  }

  if (!strategy) {
    return null;
  }

  const steps = await dbClient
    .select({
      id: allocationStrategySteps.id,
      strategyId: allocationStrategySteps.strategyId,
      orderIndex: allocationStrategySteps.orderIndex,
      stepType: allocationStrategySteps.stepType,
      targetEnvelopeId: allocationStrategySteps.targetEnvelopeId,
      targetEnvelopeName: envelopes.name,
      config: allocationStrategySteps.config,
      createdAt: allocationStrategySteps.createdAt,
      updatedAt: allocationStrategySteps.updatedAt,
      tenantId: allocationStrategySteps.tenantId,
      appId: allocationStrategySteps.appId,
      createdBy: allocationStrategySteps.createdBy,
      updatedBy: allocationStrategySteps.updatedBy,
      archivedAt: allocationStrategySteps.archivedAt,
    })
    .from(allocationStrategySteps)
    .leftJoin(envelopes, eq(allocationStrategySteps.targetEnvelopeId, envelopes.id))
    .where(
      and(
        eq(allocationStrategySteps.strategyId, strategy.id),
        eq(allocationStrategySteps.tenantId, tenantId),
        eq(allocationStrategySteps.appId, appId),
        sql`${allocationStrategySteps.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(allocationStrategySteps.orderIndex));

  return {
    ...strategy,
    steps,
  };
}
