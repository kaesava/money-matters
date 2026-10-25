import { Inngest } from 'inngest';
import { db } from '@money-matters/db';
import { sql } from 'drizzle-orm';
import { sendNotificationEmail, todayInZone } from '@money-matters/core';

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
          return prefs.weekly_digest_enabled !== false;
        });
      });

      const CHUNK_SIZE = 25;
      for (let i = 0; i < tenantMembers.length; i += CHUNK_SIZE) {
        const chunk = tenantMembers.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE);
        await step.run(`send-weekly-digest-batch-${chunkIndex}`, async () => {
          await Promise.all(
            chunk.map(async (record) => {
              if (!record.email) return;
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

                await sendNotificationEmail(
                  record.email,
                  `Weekly Cashflow Summary — ${record.tenantName}`,
                  `Here is your weekly financial digest for ${record.tenantName}:

` +
                  `• Safe to Spend: $${safeToSpend.toFixed(2)}
` +
                  `• Bills Envelope Balance: $${billsBal.toFixed(2)}

` +
                  `Log in to Money Matters to review your payday splits and forward-looking allocations!`
                );
              } catch (e) {
                console.error(`Failed to generate digest for ${record.email}:`, e);
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
        const { incomeEvents, tenants, tenantUsers, users, userPreferences, tenantUserPreferences } = await import('@money-matters/db');
        const { eq, and } = await import('drizzle-orm');

        const activeIncomes = await db
          .select({
            eventId: incomeEvents.id,
            tenantId: tenants.id,
            tenantName: tenants.name,
            userId: users.id,
            email: users.email,
            expectedDate: incomeEvents.expectedDate,
            amount: incomeEvents.expectedAmount,
            userTimezone: userPreferences.timezone,
            appPreferences: tenantUserPreferences.appPreferences,
          })
          .from(incomeEvents)
          .innerJoin(tenants, eq(incomeEvents.tenantId, tenants.id))
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
              sql`"income_events"."archived_at" IS NULL`,
              eq(incomeEvents.status, 'PENDING')
            )
          );

        return activeIncomes.filter((item) => {
          const prefs = (item.appPreferences?.['money-matters'] || item.appPreferences || {}) as Record<string, unknown>;
          if (prefs.payday_alerts_enabled === false) return false;
          const tz = item.userTimezone || 'Australia/Sydney';
          const today = todayInZone(tz);
          return item.expectedDate === today;
        });
      });

      for (const item of paydaysToday) {
        if (!item.email) continue;
        await step.run(`send-payday-alert-${item.eventId}-${item.expectedDate}`, async () => {
          await sendNotificationEmail(
            item.email,
            `Payday Alert — ${item.tenantName}`,
            `It's payday! An expected deposit of $${parseFloat(item.amount).toFixed(2)} is due today.
 
` +
            `Log in to Money Matters to allocate your payday split and ring-fence your committed expenses!`
          );
        });
      }

      return { alertsSent: paydaysToday.length };
    }
  );

  const notifyBalanceMatchNudge = inngest.createFunction(
    { id: 'notify-balance-match-nudge' },
    { cron: '0 10 * * 1' },
    async ({ step }) => {
      const overdueTenants = await step.run('fetch-overdue-balance-match-tenants', async () => {
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
        const tenantMap = new Map<string, { email: string; tenantName: string }>();

        for (const acc of accounts) {
          if (!acc.email) continue;
          const prefs = (acc.appPreferences?.['money-matters'] || acc.appPreferences || {}) as Record<string, unknown>;
          if (prefs.balance_nudge_enabled === false) continue;
          const isOverdue = !acc.lastMatchedAt || new Date(acc.lastMatchedAt).getTime() < fourteenDaysAgo;
          if (isOverdue && !tenantMap.has(acc.tenantId)) {
            tenantMap.set(acc.tenantId, { email: acc.email, tenantName: acc.tenantName });
          }
        }

        return Array.from(tenantMap.values());
      });

      for (const t of overdueTenants) {
        await step.run(`send-match-nudge-${t.email}`, async () => {
          await sendNotificationEmail(
            t.email,
            `Balance Match Reminder — ${t.tenantName}`,
            `It has been over 14 days since your last bank balance match.
 
` +
            `Take 30 seconds to align your bank balances in Money Matters to keep your safe-to-spend allowance 100% accurate!`
          );
        });
      }

      return { nudgesSent: overdueTenants.length };
    }
  );

  return [
    notifyWeeklyDigest,
    notifyPaydayAlert,
    notifyBalanceMatchNudge,
  ];
}
