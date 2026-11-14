import { Inngest } from "inngest";
import { db, envelopes, getEnvelopeBalancesMap, tenants, tenantUsers, users, userPreferences, tenantUserPreferences } from "@money-matters/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { sendNotificationEmail, formatCurrency, logger } from "@money-matters/core";
import { isChannelEnabled, isLocalScheduleMatch, readNotificationPrefs, resolveNotificationRecipient } from "../helpers.js";

export function createWeeklyDigestWorkflow(inngest: Inngest) {
  return inngest.createFunction(
    { id: "notify-weekly-digest" },
    { cron: "0 * * * *" }, // Hourly check for Sunday 9:00 AM local time
    async ({ step }) => {
      const tenantMembers = await step.run("fetch-active-tenant-members", async () => {
        const members = await db
          .select({
            tenantId: tenants.id,
            appId: tenants.appId,
            tenantName: tenants.name,
            tenantCurrency: tenants.currency,
            tenantTimezone: tenants.timezone,
            userId: users.id,
            email: users.email,
            notificationEmail: userPreferences.notificationEmail,
            userTimezone: userPreferences.timezone,
            appPreferences: tenantUserPreferences.appPreferences,
          })
          .from(tenants)
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
          .where(
            and(
              sql`"tenants"."archived_at" IS NULL`,
              inArray(tenants.subscriptionStatus, ["TRIAL_ACTIVE", "SUBSCRIBED"])
            )
          );

        return members.filter((m) => {
          const tz = m.userTimezone || m.tenantTimezone || "UTC";
          if (!isLocalScheduleMatch(tz, { hour: 9, dayOfWeek: 0 })) return false;
          const prefs = readNotificationPrefs(m.appPreferences, m.appId);
          const emailOn = isChannelEnabled(prefs, "weekly_digest_email", "weekly_digest_enabled");
          const pushOn = isChannelEnabled(prefs, "weekly_digest_push", "weekly_digest_enabled");
          return emailOn || pushOn;
        });
      });

      const CHUNK_SIZE = 25;
      for (let i = 0; i < tenantMembers.length; i += CHUNK_SIZE) {
        const chunk = tenantMembers.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE);

        await step.run(`send-weekly-digest-batch-${chunkIndex}`, async () => {
          const tenantIds = [...new Set(chunk.map((c) => c.tenantId))];

          // Bulk-query all envelopes for this batch of tenants in ONE single query (no N+1)
          const allEnvelopes = await db
            .select({
              id: envelopes.id,
              tenantId: envelopes.tenantId,
              envelopeType: envelopes.envelopeType,
              monthlyAmount: envelopes.monthlyAmount,
              targetAmount: envelopes.targetAmount,
              safetyBufferFloor: envelopes.safetyBufferFloor,
              isPrivate: envelopes.isPrivate,
              userId: envelopes.userId,
            })
            .from(envelopes)
            .where(
              and(
                inArray(envelopes.tenantId, tenantIds),
                sql`"envelopes"."archived_at" IS NULL`
              )
            );

          const tenantAppIdById = new Map<string, string>();
          for (const c of chunk) {
            tenantAppIdById.set(c.tenantId, c.appId);
          }

          const balancesByTenant: Record<string, Record<string, number>> = {};
          for (const tid of tenantIds) {
            const tenantAppId = tenantAppIdById.get(tid);
            if (tenantAppId) {
              balancesByTenant[tid] = await getEnvelopeBalancesMap(tid, tenantAppId, db);
            }
          }

          await Promise.all(
            chunk.map(async (record) => {
              try {
                const envList = allEnvelopes.filter(
                  (e) =>
                    e.tenantId === record.tenantId &&
                    (!e.isPrivate || e.userId === record.userId)
                );

                const balances = balancesByTenant[record.tenantId] || {};
                let everydayBal = 0;
                let everydayBuffer = 0;
                let billsBal = 0;

                for (const env of envList) {
                  const bal = balances[env.id] ?? 0;
                  if (env.envelopeType === "EVERYDAY") {
                    everydayBal += bal;
                    everydayBuffer += parseFloat(env.safetyBufferFloor || "0");
                  } else if (env.envelopeType === "BILL") {
                    billsBal += bal;
                  }
                }

                const safeToSpend = Math.max(0, everydayBal - everydayBuffer);
                const cur = record.tenantCurrency || "AUD";
                const formattedSafe = formatCurrency(safeToSpend, { currency: cur });
                const formattedBills = formatCurrency(billsBal, { currency: cur });

                const prefs = readNotificationPrefs(record.appPreferences, record.appId);
                const emailEnabled = isChannelEnabled(prefs, "weekly_digest_email", "weekly_digest_enabled");
                const pushEnabled = isChannelEnabled(prefs, "weekly_digest_push", "weekly_digest_enabled");
                const emailRecipient = resolveNotificationRecipient(record.email, record.notificationEmail);

                if (emailEnabled && emailRecipient) {
                  await sendNotificationEmail(
                    emailRecipient,
                    `Weekly Summary — ${record.tenantName}`,
                    `Here is your Sunday household balance check-in:\n\n` +
                    `• Safe to Spend (Everyday): ${formattedSafe}\n` +
                    `• Ring-Fenced Bills Balance: ${formattedBills}\n\n` +
                    `Keep spending freely from Everyday with zero guilt!`
                  );
                }

                if (pushEnabled) {
                  await inngest.send({
                    name: "notification/send-push",
                    data: {
                      userId: record.userId,
                      tenantId: record.tenantId,
                      title: "📊 Weekly Balance Digest",
                      body: `Safe to spend: ${formattedSafe}. Bills balance: ${formattedBills}.`,
                      data: { route: "/(app)/home" },
                    },
                  }).catch(() => {});
                }
              } catch (e) {
                logger.error(`[WeeklyDigest] Failed to generate digest for ${record.userId}:`, { error: e });
              }
            })
          );
        });
      }

      return { digestsSent: tenantMembers.length };
    }
  );
}
