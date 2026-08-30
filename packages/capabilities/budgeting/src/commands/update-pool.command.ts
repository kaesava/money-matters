import { pools, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { UpdatePoolCommand } from "@money-matters/types";

export async function updatePoolCommand(
  poolId: string,
  input: z.infer<typeof UpdatePoolCommand>,
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

    const [updated] = await tx
      .update(pools)
      .set({
        ...input,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(pools.id, poolId),
          eq(pools.tenantId, tenantId),
          eq(pools.appId, appId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Pool not found or access unauthorized.");
    }

    return updated;
  });
}
