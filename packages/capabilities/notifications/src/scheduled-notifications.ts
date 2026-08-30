import { Inngest } from 'inngest';
import { db, pools, expenseEvents, transactionLedger, deviceTokens } from '@money-matters/db';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { sendNotificationEmail } from '@money-matters/core';

export function createScheduledNotificationFunctions(inngest: Inngest) {
  if (!inngest) {
    console.warn('[Inngest] Client not initialized, skipping scheduled notification registrations.');
    return [];
  }

  // 1. Payday Alert Workflow
  const notifyPaydayAlert = inngest.createFunction(
    { id: 'notify-payday-alert' },
    { cron: '0 21 * * *' },
    async ({ step }: { step: any }) => {
      const today = new Date().toISOString().split('T')[0];

      const upcomingEvents = await step.run('fetch-today-income-events', async () => {
        return await db
          .select({
            id: expenseEvents.id,
            tenantId: expenseEvents.tenantId,
            name: expenseEvents.name,
            expectedAmount: expenseEvents.expectedAmount,
          })
          .from(expenseEvents)
          .where(
            and(
              eq(expenseEvents.expectedDate, today),
              eq(expenseEvents.status, 'UPCOMING'),
              sql`${expenseEvents.archivedAt} IS NULL`
            )
          );
      });

      return { processedCount: upcomingEvents.length };
    }
  );

  // 2. Shortfall Alert Workflow
  const notifyShortfallAlert = inngest.createFunction(
    { id: 'notify-shortfall-alert' },
    { cron: '0 22 * * *' },
    async ({ step }: { step: any }) => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const shortfalls = await step.run('check-[#2563eb]-shortfalls', async () => {
        const activePools = await db
          .select()
          .from(pools)
          .where(
            and(
              eq(pools.poolType, 'REGULAR'),
              sql`${pools.archivedAt} IS NULL`
            )
          );

        const shortfallsList = [];

        for (const pool of activePools) {
          const events = await db
            .select()
            .from(expenseEvents)
            .where(
              and(
                eq(expenseEvents.poolId, pool.id),
                gte(expenseEvents.expectedDate, today),
                lte(expenseEvents.expectedDate, sevenDaysLater),
                eq(expenseEvents.status, 'UPCOMING'),
                sql`${expenseEvents.archivedAt} IS NULL`
              )
            );

          const totalDue = events.reduce((sum, e) => sum + parseFloat(e.expectedAmount), 0);

          const [txSum] = await db
            .select({
              balance: sql<string>`COALESCE(SUM(CASE WHEN ${transactionLedger.flowType} = 'CREDIT' THEN ${transactionLedger.amount} ELSE -${transactionLedger.amount} END), 0)::text`,
            })
            .from(transactionLedger)
            .where(
              and(
                eq(transactionLedger.poolId, pool.id),
                sql`${transactionLedger.archivedAt} IS NULL`
              )
            );

          const currentBalance = parseFloat(txSum?.balance || '0');

          if (currentBalance < totalDue) {
            shortfallsList.push({
              tenantId: pool.tenantId,
              poolName: pool.name,
              currentBalance,
              totalDue,
              shortfall: totalDue - currentBalance,
            });
          }
        }

        return shortfallsList;
      });

      return { shortfallsCount: shortfalls.length };
    }
  );

  // 3. Bill Reminder Workflow
  const notifyBillReminder = inngest.createFunction(
    { id: 'notify-bill-reminder' },
    { cron: '0 23 * * *' },
    async ({ step }: { step: any }) => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const upcomingBills = await step.run('fetch-tomorrow-bills', async () => {
        return await db
          .select({
            id: expenseEvents.id,
            tenantId: expenseEvents.tenantId,
            name: expenseEvents.name,
            expectedAmount: expenseEvents.expectedAmount,
          })
          .from(expenseEvents)
          .where(
            and(
              eq(expenseEvents.expectedDate, tomorrow),
              eq(expenseEvents.status, 'UPCOMING'),
              sql`${expenseEvents.archivedAt} IS NULL`
            )
          );
      });

      return { remindedCount: upcomingBills.length };
    }
  );

  // 4. Weekly Digest Workflow
  const notifyWeeklyDigest = inngest.createFunction(
    { id: 'notify-weekly-digest' },
    { cron: '0 20 * * 0' },
    async ({ step }: { step: any }) => {
      const activeTenants = await step.run('fetch-active-tenants', async () => {
        const { tenants } = await import('@money-matters/db');
        return await db.select().from(tenants);
      });

      for (const tenant of activeTenants) {
        await step.run(`send-weekly-digest-email-${tenant.id}`, async () => {
          const { tenantUsers, users } = await import('@money-matters/db');
          const members = await db
            .select({ email: users.email })
            .from(tenantUsers)
            .innerJoin(users, eq(tenantUsers.userId, users.id))
            .where(and(eq(tenantUsers.tenantId, tenant.id), sql`${tenantUsers.archivedAt} IS NULL`));

          for (const member of members) {
            if (!member.email) continue;
            await sendNotificationEmail(
              member.email,
              `Weekly Cashflow Summary — ${tenant.name}`,
              `Here is your weekly budget summary for ${tenant.name}.\n\nLog in to Money Matters to review your 12-month cashflow matrix and payday allocations!`
            );
          }
        });
      }

      return { digestsSent: activeTenants.length };
    }
  );

  // 5. Goal Milestone Event Trigger
  const notifyGoalMilestone = inngest.createFunction(
    { id: 'notify-goal-milestone' },
    { event: 'transaction/recorded' },
    async ({ event, step }: { event: any; step: any }) => {
      const { poolId, tenantId, userId } = event.data as { poolId?: string; tenantId: string; userId: string };
      if (!poolId) return { status: 'skipped, no poolId' };

      const pool = await step.run('fetch-pool', async () => {
        const [p] = await db.select().from(pools).where(eq(pools.id, poolId)).limit(1);
        return p;
      });

      return { status: 'processed' };
    }
  );

  // 6. Spending Velocity Warning
  const notifySpendingVelocity = inngest.createFunction(
    { id: 'notify-spending-velocity' },
    { cron: '0 8 * * *' },
    async ({ step }: { step: any }) => {
      const now = new Date();
      const dayOfMonth = now.getDate();

      const alerts = await step.run('check-spending-velocity', async () => {
        const activePools = await db
          .select()
          .from(pools)
          .where(
            and(
              sql`${pools.poolType} IN ('EVERYDAY', 'REGULAR')`,
              sql`${pools.archivedAt} IS NULL`
            )
          );

        const alertsList = [];
        for (const pool of activePools) {
          const target = pool.everydayAllowanceAmount ? parseFloat(pool.everydayAllowanceAmount) : (pool.targetAmount ? parseFloat(pool.targetAmount) : 0);
          if (target <= 0) continue;

          const transactions = await db
            .select({ amount: transactionLedger.amount })
            .from(transactionLedger)
            .where(
              and(
                eq(transactionLedger.poolId, pool.id),
                eq(transactionLedger.flowType, 'DEBIT'),
                sql`${transactionLedger.archivedAt} IS NULL`
              )
            );

          const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

          const recommendedRate = (target / 30) * dayOfMonth;
          if (totalSpent > recommendedRate * 1.2) {
            alertsList.push({
              tenantId: pool.tenantId,
              poolName: pool.name,
              totalSpent,
              recommendedRate,
            });
          }
        }

        return alertsList;
      });

      return { alertsCount: alerts.length };
    }
  );

  return [
    notifyWeeklyDigest,
  ];
}

