import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import {
  resolveNotificationRecipient,
  readNotificationPrefs,
  isChannelEnabled,
  isLocalScheduleMatch,
  getNotificationChannelStatusHandler,
} from "./helpers.js";

describe("notification helpers", () => {
  it("prefers custom notificationEmail over login email", () => {
    expect(resolveNotificationRecipient("login@example.com", "alerts@example.com")).toBe("alerts@example.com");
    expect(resolveNotificationRecipient("login@example.com", "   ")).toBe("login@example.com");
    expect(resolveNotificationRecipient("login@example.com", null)).toBe("login@example.com");
    expect(resolveNotificationRecipient(null, null)).toBeNull();
  });

  it("reads preferences from appId first, then legacy money-matters key, then top-level", () => {
    const appId = "01908bde-34bb-7b19-a178-574211bc93aa";
    expect(
      readNotificationPrefs({ [appId]: { weekly_digest_email: false }, "money-matters": { weekly_digest_email: true } }, appId)
    ).toEqual({ weekly_digest_email: false });

    expect(
      readNotificationPrefs({ "money-matters": { payday_alerts_push: false } }, appId)
    ).toEqual({ payday_alerts_push: false });

    expect(
      readNotificationPrefs({ balance_nudge_email: false }, appId)
    ).toEqual({ balance_nudge_email: false });
  });

  it("evaluates channel enablement respecting legacy flag", () => {
    expect(isChannelEnabled({}, "weekly_digest_email", "weekly_digest_enabled")).toBe(true);
    expect(isChannelEnabled({ weekly_digest_email: false }, "weekly_digest_email", "weekly_digest_enabled")).toBe(false);
    expect(isChannelEnabled({ weekly_digest_enabled: false }, "weekly_digest_email", "weekly_digest_enabled")).toBe(false);
  });

  it("matches local day and hour in user timezone", () => {
    // 2026-11-14T22:00:00Z is Sunday 2026-11-15 09:00 AEDT (UTC+11) in Australia/Sydney
    const instant = new Date("2026-11-14T22:00:00Z");
    expect(isLocalScheduleMatch("Australia/Sydney", { hour: 9, dayOfWeek: 0 }, instant)).toBe(true);
    expect(isLocalScheduleMatch("UTC", { hour: 9, dayOfWeek: 0 }, instant)).toBe(false);
    expect(isLocalScheduleMatch("UTC", { hour: 22, dayOfWeek: 6 }, instant)).toBe(true);
  });

  it("returns notification channel status with custom email flag and mobile device count", async () => {
    let callCount = 0;
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((onFulfilled) => {
        callCount += 1;
        const rows = callCount === 1
          ? [{ notificationEmail: "alerts@example.com" }]
          : [{ id: "tok-1" }, { id: "tok-2" }];
        return Promise.resolve(rows).then(onFulfilled);
      }),
    } as unknown as DbOrTx;

    const status = await getNotificationChannelStatusHandler(mockDb)(
      "tenant-1",
      "user-1",
      "login@example.com"
    );
    expect(status).toEqual({
      emailRecipient: "alerts@example.com",
      usesCustomNotificationEmail: true,
      mobilePushDeviceCount: 2,
    });
  });
});
