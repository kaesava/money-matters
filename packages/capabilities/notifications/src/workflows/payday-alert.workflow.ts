import { Inngest } from "inngest";
import { db, incomeEvents, incomeSources, bankAccounts, tenants, tenantUsers, users, userPreferences, tenantUserPreferences } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { sendNotificationEmail, todayInZone, getLocalHourInZone, formatCurrency } from "@money-matters/core";
import { isChannelEnabled, readNotificationPrefs, resolveNotificationRecipient } from "../helpers.js";

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
            appId: tenants.appId,
            tenantName: tenants.name,
            tenantCurrency: tenants.currency,
            tenantTimezone: tenants.timezone,
            userId: users.id,
            email: users.email,
            notificationEmail: userPreferences.notificationEmail,
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

          const prefs = readNotificationPrefs(item.appPreferences, item.appId);
          const emailOn = isChannelEnabled(prefs, "payday_alerts_email", "payday_alerts_enabled");
          const pushOn = isChannelEnabled(prefs, "payday_alerts_push", "payday_alerts_enabled");
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
          const prefs = readNotificationPrefs(item.appPreferences, item.appId);
          const emailEnabled = isChannelEnabled(prefs, "payday_alerts_email", "payday_alerts_enabled");
          const pushEnabled = isChannelEnabled(prefs, "payday_alerts_push", "payday_alerts_enabled");
          const emailRecipient = resolveNotificationRecipient(item.email, item.notificationEmail);

          if (emailEnabled && emailRecipient) {
            await sendNotificationEmail(
              emailRecipient,
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
