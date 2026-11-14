import { Inngest } from "inngest";
import { db, bankAccounts, tenants, tenantUsers, users, userPreferences, tenantUserPreferences } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { sendNotificationEmail } from "@money-matters/core";
import { isChannelEnabled, isLocalScheduleMatch, readNotificationPrefs, resolveNotificationRecipient } from "../helpers.js";

export function createBalanceNudgeWorkflow(inngest: Inngest) {
  return inngest.createFunction(
    { id: "notify-balance-match-nudge" },
    { cron: "0 * * * *" }, // Hourly check for Monday 10:00 AM local time
    async ({ step }) => {
      const overdueMembers = await step.run("fetch-overdue-balance-match-members", async () => {
        const accounts = await db
          .select({
            tenantId: tenants.id,
            appId: tenants.appId,
            tenantName: tenants.name,
            tenantTimezone: tenants.timezone,
            userId: users.id,
            email: users.email,
            notificationEmail: userPreferences.notificationEmail,
            userTimezone: userPreferences.timezone,
            lastMatchedAt: bankAccounts.lastBalanceMatchedAt,
            isPrivateAccount: bankAccounts.isPrivate,
            accountOwnerId: bankAccounts.userId,
            appPreferences: tenantUserPreferences.appPreferences,
          })
          .from(bankAccounts)
          .innerJoin(tenants, eq(bankAccounts.tenantId, tenants.id))
          .innerJoin(tenantUsers, and(eq(tenantUsers.tenantId, tenants.id), sql`"tenant_users"."archived_at" IS NULL`))
          .innerJoin(users, eq(tenantUsers.userId, users.id))
          .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
          .leftJoin(
            tenantUserPreferences,
            and(
              eq(tenantUserPreferences.userId, users.id),
              eq(tenantUserPreferences.tenantId, tenants.id)
            )
          )
          .where(sql`"bank_accounts"."archived_at" IS NULL`);

        const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const memberMap = new Map<string, {
          userId: string;
          tenantId: string;
          appId: string;
          emailRecipient: string | null;
          tenantName: string;
          appPreferences: unknown;
        }>();

        for (const acc of accounts) {
          // Stealth Privacy Check: private accounts only nudge their owner
          if (acc.isPrivateAccount && acc.accountOwnerId && acc.accountOwnerId !== acc.userId) {
            continue;
          }

          const tz = acc.userTimezone || acc.tenantTimezone || "UTC";
          if (!isLocalScheduleMatch(tz, { hour: 10, dayOfWeek: 1 })) continue;

          const prefs = readNotificationPrefs(acc.appPreferences, acc.appId);
          const emailOn = isChannelEnabled(prefs, "balance_nudge_email", "balance_nudge_enabled");
          const pushOn = isChannelEnabled(prefs, "balance_nudge_push", "balance_nudge_enabled");
          if (!emailOn && !pushOn) continue;

          const isOverdue = !acc.lastMatchedAt || new Date(acc.lastMatchedAt).getTime() < fourteenDaysAgo;
          const key = `${acc.tenantId}-${acc.userId}`;
          if (isOverdue && !memberMap.has(key)) {
            memberMap.set(key, {
              userId: acc.userId,
              tenantId: acc.tenantId,
              appId: acc.appId,
              emailRecipient: resolveNotificationRecipient(acc.email, acc.notificationEmail),
              tenantName: acc.tenantName,
              appPreferences: acc.appPreferences,
            });
          }
        }

        return Array.from(memberMap.values());
      });

      for (const m of overdueMembers) {
        await step.run(`send-match-nudge-${m.tenantId}-${m.userId}`, async () => {
          const prefs = readNotificationPrefs(m.appPreferences, m.appId);
          const emailEnabled = isChannelEnabled(prefs, "balance_nudge_email", "balance_nudge_enabled");
          const pushEnabled = isChannelEnabled(prefs, "balance_nudge_push", "balance_nudge_enabled");

          if (emailEnabled && m.emailRecipient) {
            await sendNotificationEmail(
              m.emailRecipient,
              `Balance Match Reminder — ${m.tenantName}`,
              `It has been over 14 days since your last bank balance match.\n\n` +
              `Take 30 seconds to align your bank balances in Money Matters to keep your safe-to-spend allowance 100% accurate!`
            );
          }

          if (pushEnabled) {
            await inngest.send({
              name: "notification/send-push",
              data: {
                userId: m.userId,
                tenantId: m.tenantId,
                title: "⚖️ Balance Match Reminder",
                body: "It has been over 14 days since your last bank match. Tap to align balances.",
                data: { route: "/(app)/home" },
              },
            }).catch(() => {});
          }
        });
      }

      return { nudgesSent: overdueMembers.length };
    }
  );
}
