import { eq, and } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { deviceTokens } from "@money-matters/db";
import { logger } from "@money-matters/core";

export function registerDeviceTokenHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: { platform: "ios" | "android" | "web"; token: string },
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const now = new Date();

    const [existing] = await db
      .select()
      .from(deviceTokens)
      .where(
        and(
          eq(deviceTokens.userId, userId),
          eq(deviceTokens.tenantId, tenantId),
          eq(deviceTokens.platform, input.platform)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(deviceTokens)
        .set({
          token: input.token,
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

export function removeDeviceTokenHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: { platform: "ios" | "android" | "web" },
    tenantId: string,
    userId: string
  ) => {
    const [existing] = await db
      .select()
      .from(deviceTokens)
      .where(
        and(
          eq(deviceTokens.userId, userId),
          eq(deviceTokens.tenantId, tenantId),
          eq(deviceTokens.platform, input.platform)
        )
      )
      .limit(1);

    if (!existing) {
      return { success: true, message: "No token found to remove" };
    }

    await db.delete(deviceTokens).where(eq(deviceTokens.id, existing.id));
    return { success: true, message: "Token removed" };
  };
}

export * from "./email.js";
export * from "./inngest.js";
