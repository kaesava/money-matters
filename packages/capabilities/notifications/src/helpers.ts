import { and, eq, inArray, isNull } from "drizzle-orm";
import { DbOrTx, deviceTokens, userPreferences } from "@money-matters/db";
import { getLocalDayOfWeekInZone, getLocalHourInZone } from "@money-matters/core";
import type { NotificationChannelStatus } from "@money-matters/types";

export function resolveNotificationRecipient(
  loginEmail?: string | null,
  notificationEmail?: string | null
): string | null {
  const custom = notificationEmail?.trim();
  if (custom) return custom;
  const fallback = loginEmail?.trim();
  return fallback || null;
}

export function readNotificationPrefs(
  appPreferences: unknown,
  appId?: string | null
): Record<string, unknown> {
  if (!appPreferences || typeof appPreferences !== "object") return {};
  const raw = appPreferences as Record<string, unknown>;
  if (appId && raw[appId] && typeof raw[appId] === "object") {
    return raw[appId] as Record<string, unknown>;
  }
  if (raw["money-matters"] && typeof raw["money-matters"] === "object") {
    return raw["money-matters"] as Record<string, unknown>;
  }
  return raw;
}

export function isChannelEnabled(
  prefs: Record<string, unknown>,
  channelKey: string,
  legacyKey: string
): boolean {
  return prefs[channelKey] !== false && prefs[legacyKey] !== false;
}

export function isLocalScheduleMatch(
  timeZone: string,
  target: { hour: number; dayOfWeek?: number },
  now: Date = new Date()
): boolean {
  const tz = timeZone || "UTC";
  if (getLocalHourInZone(tz, now) !== target.hour) return false;
  if (target.dayOfWeek !== undefined && getLocalDayOfWeekInZone(tz, now) !== target.dayOfWeek) {
    return false;
  }
  return true;
}

export function getNotificationChannelStatusHandler(db: DbOrTx) {
  return async (
    tenantId: string,
    userId: string,
    loginEmail: string
  ): Promise<NotificationChannelStatus> => {
    const [pref] = await db
      .select({ notificationEmail: userPreferences.notificationEmail })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const activeMobileTokens = await db
      .select({ id: deviceTokens.id })
      .from(deviceTokens)
      .where(
        and(
          eq(deviceTokens.tenantId, tenantId),
          eq(deviceTokens.userId, userId),
          inArray(deviceTokens.platform, ["ios", "android"]),
          isNull(deviceTokens.archivedAt)
        )
      );

    const customEmail = pref?.notificationEmail?.trim() || null;
    return {
      emailRecipient: customEmail || loginEmail,
      usesCustomNotificationEmail: Boolean(customEmail && customEmail !== loginEmail),
      mobilePushDeviceCount: activeMobileTokens.length,
    };
  };
}
