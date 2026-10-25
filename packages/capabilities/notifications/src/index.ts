import { eq, and, isNull } from "drizzle-orm";
import { DbOrTx, deviceTokens } from "@money-matters/db";

export function registerDeviceTokenHandler(db: DbOrTx) {
  return async (
    input: { platform: "ios" | "android" | "web"; token: string },
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const now = new Date();

    // Check if token already exists (even if previously archived)
    const [existing] = await db
      .select()
      .from(deviceTokens)
      .where(
        and(
          eq(deviceTokens.userId, userId),
          eq(deviceTokens.tenantId, tenantId),
          eq(deviceTokens.token, input.token)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(deviceTokens)
        .set({
          platform: input.platform,
          archivedAt: null,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(deviceTokens.id, existing.id))
        .returning();

      return { id: updated.id, action: "updated" as const };
    }

    const [created] = await db
      .insert(deviceTokens)
      .values({
        userId,
        tenantId,
        appId,
        platform: input.platform,
        token: input.token,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return { id: created.id, action: "created" as const };
  };
}

export function removeDeviceTokenHandler(db: DbOrTx) {
  return async (
    input: { platform: "ios" | "android" | "web"; token?: string },
    tenantId: string,
    userId: string
  ) => {
    const conditions = [
      eq(deviceTokens.userId, userId),
      eq(deviceTokens.tenantId, tenantId),
      eq(deviceTokens.platform, input.platform),
      isNull(deviceTokens.archivedAt),
    ];

    if (input.token) {
      conditions.push(eq(deviceTokens.token, input.token));
    }

    const activeTokens = await db
      .select()
      .from(deviceTokens)
      .where(and(...conditions));

    if (activeTokens.length === 0) {
      return { success: true, message: "No active token found to remove" };
    }

    const now = new Date();
    for (const t of activeTokens) {
      await db
        .update(deviceTokens)
        .set({
          archivedAt: now,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(deviceTokens.id, t.id));
    }

    return { success: true, message: "Token removed" };
  };
}

export * from "./inngest.js";
export * from "./scheduled-notifications.js";

