import { Inngest } from "inngest";
import { db, incomeEvents, incomeSources, bankAccounts, tenants, tenantUsers, users, userPreferences, tenantUserPreferences } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { sendNotificationEmail, todayInZone, getLocalHourInZone, formatCurrency } from "@money-matters/core";

export function createPaydayAlertWorkflow(inngest: Inngest) {
  return inngest.createFunction(
    { id: "notify-payday-alert" },
    { cron: "0 * * * *" }, // Hourly check for local 8:00 AM delivery
    async ({ step }) => {
      const paydaysToday = await step.run("fetch-paydays-today", async () => {
        const activeIncomes = await db
          .select({
            eventId: incomeEvents.id,
            tenantId: tenants.id,
            tenantName: tenants.name,
            tenantCurrency: tenants.currency,
            tenantTimezone: tenants.timezone,
            userId: users.id,
            email: users.email,
            expectedDate: incomeEvents.expectedDate,
            amount: incomeEvents.expectedAmount,
            userTimezone: userPreferences.timezone,
            appPreferences: tenantUserPreferences.appPreferences,
            isPrivateAccount: bankAccounts.isPrivate,
            accountOwnerId: bankAccounts.userId,
          })
          .from(incomeEvents)
          .innerJoin(tenants, eq(incomeEvents.tenantId, tenants.id))
          .innerJoin(tenantUsers, and(eq(tenantUsers.tenantId, tenants.id), sql`"tenant_users"."archived_at" IS NULL`))
          .innerJoin(users, eq(tenantUsers.userId, users.id))
          .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
          .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
          .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
          .leftJoin(
            tenantUserPreferences,
            and(
              eq(tenantUserPreferences.userId, users.id),
              eq(tenantUserPreferences.tenantId, tenants.id)
            )
          )
          .where(
            and(
              sql`"income_events"."archived_at" IS NULL`,
              eq(incomeEvents.status, "PENDING")
            )
          );

        return activeIncomes.filter((item) => {
          // Stealth Privacy Check: If account is private, only owner gets notified
          if (item.isPrivateAccount && item.accountOwnerId && item.accountOwnerId !== item.userId) {
            return false;
          }

          const prefs = (item.appPreferences?.["money-matters"] || item.appPreferences || {}) as Record<string, unknown>;
          const emailOn = prefs["payday_alerts_email"] !== false && prefs["payday_alerts_enabled"] !== false;
          const pushOn = prefs["payday_alerts_push"] !== false && prefs["payday_alerts_enabled"] !== false;
          if (!emailOn && !pushOn) return false;

          const tz = item.userTimezone || item.tenantTimezone || "UTC";
          const today = todayInZone(tz);
          const localHour = getLocalHourInZone(tz);

          // Local-hour morning delivery: fires at 8 AM local time on payday date
          return item.expectedDate === today && localHour === 8;
        });
      });

      for (const item of paydaysToday) {
        await step.run(`send-payday-alert-${item.eventId}-${item.expectedDate}`, async () => {
          const cur = item.tenantCurrency || "AUD";
          const formattedAmount = formatCurrency(item.amount, { currency: cur });
          const prefs = (item.appPreferences?.["money-matters"] || item.appPreferences || {}) as Record<string, unknown>;
          const emailEnabled = prefs["payday_alerts_email"] !== false && prefs["payday_alerts_enabled"] !== false;
          const pushEnabled = prefs["payday_alerts_push"] !== false && prefs["payday_alerts_enabled"] !== false;

          if (emailEnabled && item.email) {
            await sendNotificationEmail(
              item.email,
              `Payday Alert — ${item.tenantName}`,
              `It's payday! An expected deposit of ${formattedAmount} is due today.\n\n` +
              `Log in to Money Matters to confirm your payday plan and ring-fence your committed expenses!`
            );
          }

          if (pushEnabled) {
            await inngest.send({
              name: "notification/send-push",
              data: {
                userId: item.userId,
                tenantId: item.tenantId,
                title: "💰 Payday Alert",
                body: `An expected deposit of ${formattedAmount} is scheduled today. Tap to allocate.`,
                data: { route: "/(app)/home" },
              },
            }).catch(() => {});
          }
        });
      }

      return { alertsSent: paydaysToday.length };
    }
  );
}
