import { pools, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
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
    // 1. Fetch bank account to check privacy status
    const [targetAccount] = await tx
      .select({ id: bankAccounts.id, isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, input.bankAccountId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    if (!targetAccount) {
      throw new Error("Linked bank account not found.");
    }

    const isPrivate = Boolean(targetAccount.isPrivate);

    // 2. Enforce Pool Constraints:
    // Exactly 1 Shared Bills pool & 1 Shared Everyday pool per household.
    // At most 1 Private Bills pool & 1 Private Everyday pool per user.
    if (input.poolType === "EVERYDAY" || input.poolType === "REGULAR") {
      const activeSameTypePools = await tx
        .select({
          id: pools.id,
          name: pools.name,
          poolType: pools.poolType,
          isPrivate: bankAccounts.isPrivate,
          userId: bankAccounts.userId,
        })
        .from(pools)
        .innerJoin(bankAccounts, eq(pools.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(pools.tenantId, tenantId),
            eq(pools.appId, appId),
            eq(pools.poolType, input.poolType),
            sql`${pools.archivedAt} IS NULL`
          )
        );

      if (!isPrivate) {
        const existingShared = activeSameTypePools.find((p) => !p.isPrivate);
        if (existingShared) {
          throw new Error(
            input.poolType === "EVERYDAY"
              ? "A shared Everyday pool already exists in this household."
              : "A shared Bills pool already exists in this household."
          );
        }
      } else {
        const existingPrivate = activeSameTypePools.find((p) => p.isPrivate && p.userId === userId);
        if (existingPrivate) {
          throw new Error(
            input.poolType === "EVERYDAY"
              ? "You already have a private Everyday pool."
              : "You already have a private Bills pool."
          );
        }
      }
    }

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
        safetyBufferFloor: input.safetyBufferFloor || "0.00",
        targetAmount: input.targetAmount || null,
        targetDate: input.targetDate || null,
        isCommitted: input.isCommitted ?? false,
        isSurplusTarget: input.isSurplusTarget ?? false,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return pool;
  });
}
