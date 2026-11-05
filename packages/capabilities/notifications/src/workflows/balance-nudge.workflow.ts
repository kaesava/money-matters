import { Inngest } from "inngest";
import { db, bankAccounts, tenants, tenantUsers, users, tenantUserPreferences } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { sendNotificationEmail } from "@money-matters/core";

export function createBalanceNudgeWorkflow(inngest: Inngest) {
  return inngest.createFunction(
    { id: "notify-balance-match-nudge" },
    { cron: "0 10 * * 1" }, // Every Monday at 10:00 AM UTC
    async ({ step }) => {
      const overdueMembers = await step.run("fetch-overdue-balance-match-members", async () => {
        const accounts = await db
          .select({
            tenantId: tenants.id,
            tenantName: tenants.name,
            userId: users.id,
            email: users.email,
            lastMatchedAt: bankAccounts.lastBalanceMatchedAt,
            appPreferences: tenantUserPreferences.appPreferences,
          })
          .from(bankAccounts)
          .innerJoin(tenants, eq(bankAccounts.tenantId, tenants.id))
          .innerJoin(tenantUsers, and(eq(tenantUsers.tenantId, tenants.id), sql`"tenant_users"."archived_at" IS NULL`))
          .innerJoin(users, eq(tenantUsers.userId, users.id))
          .leftJoin(
            tenantUserPreferences,
            and(
              eq(tenantUserPreferences.userId, users.id),
              eq(tenantUserPreferences.tenantId, tenants.id)
            )
          )
          .where(sql`"bank_accounts"."archived_at" IS NULL`);

        const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const memberMap = new Map<string, { userId: string; tenantId: string; email: string; tenantName: string; appPreferences: unknown }>();

        for (const acc of accounts) {
          const prefs = (acc.appPreferences?.["money-matters"] || acc.appPreferences || {}) as Record<string, unknown>;
          const emailOn = prefs["balance_nudge_email"] !== false && prefs["balance_nudge_enabled"] !== false;
          const pushOn = prefs["balance_nudge_push"] !== false && prefs["balance_nudge_enabled"] !== false;
          if (!emailOn && !pushOn) continue;

          const isOverdue = !acc.lastMatchedAt || new Date(acc.lastMatchedAt).getTime() < fourteenDaysAgo;
          const key = `${acc.tenantId}-${acc.userId}`;
          if (isOverdue && !memberMap.has(key)) {
            memberMap.set(key, {
              userId: acc.userId,
              tenantId: acc.tenantId,
              email: acc.email,
              tenantName: acc.tenantName,
              appPreferences: acc.appPreferences,
            });
          }
        }

        return Array.from(memberMap.values());
      });

      for (const m of overdueMembers) {
        await step.run(`send-match-nudge-${m.tenantId}-${m.userId}`, async () => {
          const rawPrefs = (m.appPreferences || {}) as Record<string, unknown>;
          const prefs = ((rawPrefs["money-matters"] as Record<string, unknown> | undefined) || rawPrefs) as Record<string, unknown>;
          const emailEnabled = prefs["balance_nudge_email"] !== false && prefs["balance_nudge_enabled"] !== false;
          const pushEnabled = prefs["balance_nudge_push"] !== false && prefs["balance_nudge_enabled"] !== false;

          if (emailEnabled && m.email) {
            await sendNotificationEmail(
              m.email,
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
