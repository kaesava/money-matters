import { Inngest } from 'inngest';
import { db } from '@money-matters/db';
import { sql } from 'drizzle-orm';
import { sendNotificationEmail, todayInZone, getLocalHourInZone, formatCurrency } from '@money-matters/core';

export function createScheduledNotificationFunctions(inngest: Inngest) {
  if (!inngest) {
    console.warn('[Inngest] Client not initialized, skipping scheduled notification registrations.');
    return [];
  }

  const notifyWeeklyDigest = inngest.createFunction(
    { id: 'notify-weekly-digest' },
    { cron: '0 9 * * 0' },
    async ({ step }) => {
      const tenantMembers = await step.run('fetch-active-tenant-members', async () => {
        const { tenants, tenantUsers, users, tenantUserPreferences } = await import('@money-matters/db');
        const { eq, and, inArray } = await import('drizzle-orm');
        const members = await db
          .select({
            tenantId: tenants.id,
            tenantName: tenants.name,
            tenantCurrency: tenants.currency,
            userId: users.id,
            email: users.email,
            appPreferences: tenantUserPreferences.appPreferences,
          })
          .from(tenants)
          .innerJoin(tenantUsers, and(eq(tenantUsers.tenantId, tenants.id), sql`"tenant_users"."archived_at" IS NULL`))
          .innerJoin(users, eq(tenantUsers.userId, users.id))
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
              inArray(tenants.subscriptionStatus, ['TRIAL_ACTIVE', 'SUBSCRIBED'])
            )
          );

        return members.filter((m) => {
          const prefs = (m.appPreferences?.['money-matters'] || m.appPreferences || {}) as Record<string, unknown>;
          const emailOn = prefs.weekly_digest_email !== false && prefs.weekly_digest_enabled !== false;
          const pushOn = prefs.weekly_digest_push !== false && prefs.weekly_digest_enabled !== false;
          return emailOn || pushOn;
        });
      });

      const CHUNK_SIZE = 25;
      for (let i = 0; i < tenantMembers.length; i += CHUNK_SIZE) {
        const chunk = tenantMembers.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE);
        await step.run(`send-weekly-digest-batch-${chunkIndex}`, async () => {
          await Promise.all(
            chunk.map(async (record) => {
              try {
                const { envelopes, getEnvelopeBalancesMap } = await import('@money-matters/db');
                const { eq, and, or } = await import('drizzle-orm');

                const envList = await db
                  .select({
                    id: envelopes.id,
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
                      eq(envelopes.tenantId, record.tenantId),
                      sql`"envelopes"."archived_at" IS NULL`,
                      or(
                        eq(envelopes.isPrivate, false),
                        eq(envelopes.userId, record.userId)
                      )
                    )
                  );

                const balances = await getEnvelopeBalancesMap(record.tenantId, 'default', db);
                let everydayBal = 0;
                let everydayBuffer = 0;
                let billsBal = 0;

                for (const env of envList) {
                  const bal = balances[env.id] ?? 0;
                  if (env.envelopeType === 'EVERYDAY') {
                    everydayBal += bal;
                    everydayBuffer += parseFloat(env.safetyBufferFloor || '0');
                  } else if (env.envelopeType === 'SCHEDULED_BILL' || env.envelopeType === 'FLEXIBLE_BILL') {
                    billsBal += bal;
                  }
                }

                const safeToSpend = Math.max(0, everydayBal - everydayBuffer);
                const cur = record.tenantCurrency || 'AUD';
                const formattedSafe = formatCurrency(safeToSpend, { currency: cur });
                const formattedBills = formatCurrency(billsBal, { currency: cur });

                const prefs = (record.appPreferences?.['money-matters'] || record.appPreferences || {}) as Record<string, unknown>;
                const emailEnabled = prefs.weekly_digest_email !== false && prefs.weekly_digest_enabled !== false;
                const pushEnabled = prefs.weekly_digest_push !== false && prefs.weekly_digest_enabled !== false;

                if (emailEnabled && record.email) {
                  await sendNotificationEmail(
                    record.email,
                    `Weekly Cashflow Summary — ${record.tenantName}`,
                    `Here is your weekly financial digest for ${record.tenantName}:\n\n` +
                    `• Safe to Spend: ${formattedSafe}\n` +
                    `• Bills Envelope Balance: ${formattedBills}\n\n` +
                    `Log in to Money Matters to review your payday plans and forward-looking allocations!`
                  );
                }

                if (pushEnabled) {
                  await inngest.send({
                    name: 'notification/send-push',
                    data: {
                      userId: record.userId,
                      tenantId: record.tenantId,
                      title: '📊 Weekly Balance Digest',
                      body: `Safe to spend: ${formattedSafe}. Bills balance: ${formattedBills}.`,
                      data: { route: '/(app)/home' },
                    },
                  }).catch(() => {});
                }
              } catch (e) {
                console.error(`Failed to generate digest for ${record.userId}:`, e);
              }
            })
          );
        });
      }

      return { digestsSent: tenantMembers.length };
    }
  );

  const notifyPaydayAlert = inngest.createFunction(
    { id: 'notify-payday-alert' },
    { cron: '0 * * * *' },
    async ({ step }) => {
      const paydaysToday = await step.run('fetch-paydays-today', async () => {
        const { incomeEvents, incomeSources, bankAccounts, tenants, tenantUsers, users, userPreferences, tenantUserPreferences } = await import('@money-matters/db');
        const { eq, and } = await import('drizzle-orm');

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
              eq(incomeEvents.status, 'PENDING')
            )
          );

        return activeIncomes.filter((item) => {
          // Stealth Privacy Check: If account is private, only owner gets notified
          if (item.isPrivateAccount && item.accountOwnerId && item.accountOwnerId !== item.userId) {
            return false;
          }

          const prefs = (item.appPreferences?.['money-matters'] || item.appPreferences || {}) as Record<string, unknown>;
          const emailOn = prefs.payday_alerts_email !== false && prefs.payday_alerts_enabled !== false;
          const pushOn = prefs.payday_alerts_push !== false && prefs.payday_alerts_enabled !== false;
          if (!emailOn && !pushOn) return false;

          const tz = item.userTimezone || item.tenantTimezone || 'UTC';
          const today = todayInZone(tz);
          const localHour = getLocalHourInZone(tz);

          // Local-hour morning delivery: fires at 8 AM local time on payday date
          return item.expectedDate === today && localHour === 8;
        });
      });

      for (const item of paydaysToday) {
        await step.run(`send-payday-alert-${item.eventId}-${item.expectedDate}`, async () => {
          const cur = item.tenantCurrency || 'AUD';
          const formattedAmount = formatCurrency(item.amount, { currency: cur });
          const prefs = (item.appPreferences?.['money-matters'] || item.appPreferences || {}) as Record<string, unknown>;
          const emailEnabled = prefs.payday_alerts_email !== false && prefs.payday_alerts_enabled !== false;
          const pushEnabled = prefs.payday_alerts_push !== false && prefs.payday_alerts_enabled !== false;

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
              name: 'notification/send-push',
              data: {
                userId: item.userId,
                tenantId: item.tenantId,
                title: '💰 Payday Alert',
                body: `An expected deposit of ${formattedAmount} is scheduled today. Tap to allocate.`,
                data: { route: '/(app)/home' },
              },
            }).catch(() => {});
          }
        });
      }

      return { alertsSent: paydaysToday.length };
    }
  );

  const notifyBalanceMatchNudge = inngest.createFunction(
    { id: 'notify-balance-match-nudge' },
    { cron: '0 10 * * 1' },
    async ({ step }) => {
      const overdueMembers = await step.run('fetch-overdue-balance-match-members', async () => {
        const { tenants, bankAccounts, tenantUsers, users, tenantUserPreferences } = await import('@money-matters/db');
        const { eq, and } = await import('drizzle-orm');

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
          const prefs = (acc.appPreferences?.['money-matters'] || acc.appPreferences || {}) as Record<string, unknown>;
          const emailOn = prefs.balance_nudge_email !== false && prefs.balance_nudge_enabled !== false;
          const pushOn = prefs.balance_nudge_push !== false && prefs.balance_nudge_enabled !== false;
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
          const prefs = ((rawPrefs['money-matters'] as Record<string, unknown> | undefined) || rawPrefs) as Record<string, unknown>;
          const emailEnabled = prefs.balance_nudge_email !== false && prefs.balance_nudge_enabled !== false;
          const pushEnabled = prefs.balance_nudge_push !== false && prefs.balance_nudge_enabled !== false;

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
              name: 'notification/send-push',
              data: {
                userId: m.userId,
                tenantId: m.tenantId,
                title: '⚖️ Balance Match Reminder',
                body: 'It has been over 14 days since your last bank match. Tap to align balances.',
                data: { route: '/(app)/home' },
              },
            }).catch(() => {});
          }
        });
      }

      return { nudgesSent: overdueMembers.length };
    }
  );

  return [
    notifyWeeklyDigest,
    notifyPaydayAlert,
    notifyBalanceMatchNudge,
  ];
}

