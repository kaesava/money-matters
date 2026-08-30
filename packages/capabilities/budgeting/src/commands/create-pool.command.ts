import { pools, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { CreatePoolCommand } from "@money-matters/types";

export async function createPoolCommand(
  input: z.infer<typeof CreatePoolCommand>,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  return await dbClient.transaction(async (tx) => {
    if (input.isSurplusTarget === true) {
      await tx
        .update(pools)
        .set({ isSurplusTarget: false })
        .where(
          and(
            eq(pools.tenantId, tenantId),
            eq(pools.appId, appId),
            eq(pools.isSurplusTarget, true)
          )
        );
    }

    const [pool] = await tx
      .insert(pools)
      .values({
        name: input.name,
        poolType: input.poolType,
        bankAccountId: input.bankAccountId,
        everydayAllowanceAmount: input.everydayAllowanceAmount || null,
        rolloverRule: input.rolloverRule || "ROLLOVER",
        targetAmount: input.targetAmount || null,
        targetDate: input.targetDate || null,
        isCommitted: input.isCommitted ?? false,
        isSurplusTarget: input.isSurplusTarget ?? false,
        waterfallPriority: input.waterfallPriority ?? 50,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return pool;
  });
}
