import { transactionLedger, pools, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { MoveMoneyCommand } from "@money-matters/types";
import { randomUUID } from "crypto";

export async function moveMoneyCommand(
  input: z.infer<typeof MoveMoneyCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  if (input.sourcePoolId === input.destinationPoolId) {
    throw new Error("Cannot move money to the same pool.");
  }

  return await dbClient.transaction(async (tx) => {
    // 1. Verify access to source pool
    const [sourcePool] = await tx
      .select()
      .from(pools)
      .where(
        and(
          eq(pools.id, input.sourcePoolId),
          eq(pools.tenantId, tenantId),
          eq(pools.appId, appId)
        )
      );

    if (!sourcePool) {
      throw new Error("Source pool invalid or access unauthorized.");
    }

    // 2. Verify access to destination pool
    const [destPool] = await tx
      .select()
      .from(pools)
      .where(
        and(
          eq(pools.id, input.destinationPoolId),
          eq(pools.tenantId, tenantId),
          eq(pools.appId, appId)
        )
      );

    if (!destPool) {
      throw new Error("Destination pool invalid or access unauthorized.");
    }

    // 3. Verify sufficient balance in source pool
    const { getPoolBalancesMap } = await import("@money-matters/db");
    const balancesMap = await getPoolBalancesMap(tenantId, appId, tx);

    const sourceBalance = balancesMap[input.sourcePoolId] || 0;
    const transferAmount = parseFloat(input.amount);

    if (sourceBalance < transferAmount) {
      throw new Error(`Insufficient funds in ${sourcePool.name}. Available: $${sourceBalance.toFixed(2)}, requested: $${transferAmount.toFixed(2)}.`);
    }


    const note = input.note || `Transferred $${input.amount} from ${sourcePool.name} to ${destPool.name}`;
    const timestamp = new Date();
    const commonId = randomUUID();

    // 3. Bulk insert DEBIT and CREDIT transactions in single SQL statement
    await tx.insert(transactionLedger).values([
      {
        poolId: input.sourcePoolId,
        flowType: "DEBIT",
        amount: input.amount,
        idempotencyKey: `move-debit-${commonId}`,
        transferGroupId: commonId,
        note,
        source: "MANUAL",
        recordedAt: timestamp,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        poolId: input.destinationPoolId,
        flowType: "CREDIT",
        amount: input.amount,
        idempotencyKey: `move-credit-${commonId}`,
        transferGroupId: commonId,
        note,
        source: "MANUAL",
        recordedAt: timestamp,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
    ]);

    return { success: true };
  });
}
