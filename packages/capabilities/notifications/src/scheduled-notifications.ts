import { Inngest } from 'inngest';
import { db, incomeEvents, incomeSources, expenseEvents, categories, userPreferences } from '@money-matters/db';
import { eq, and, lte, gte } from 'drizzle-orm';

export function createScheduledNotificationFunctions(inngest: Inngest) {
  // 1. Payday Incoming
  const notifyPaydayIncoming = inngest.createFunction(
    { id: 'notify-payday-incoming' },
    { cron: '0 8 * * *' }, // 6pm AEST
    async ({ step }) => {
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const upcomingPaydays = await step.run('fetch-paydays-tomorrow', async () => {
        return await db
          .select({
            id: incomeEvents.id,
            expectedAmount: incomeEvents.expectedAmount,
            tenantId: incomeEvents.tenantId,
            createdBy: incomeEvents.createdBy,
            sourceName: incomeSources.name,
          })
          .from(incomeEvents)
          .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
          .where(and(eq(incomeEvents.status, 'UPCOMING'), eq(incomeEvents.expectedDate, tomorrowStr)));
      });

      for (const payday of upcomingPaydays) {
        await step.sendEvent(`trigger-push-${payday.id}`, {
          name: 'notification/send-push',
          data: {
            userId: payday.createdBy,
            tenantId: payday.tenantId,
            title: '💰 Payday Tomorrow',
            body: `${payday.sourceName || 'Income'} — $${parseFloat(payday.expectedAmount).toFixed(2)} expected.`,
            data: { screen: 'home', eventId: payday.id },
          },
        });
      }

      return { count: upcomingPaydays.length };
    }
  );

  // 2. Bill Due Soon
  const notifyBillDueSoon = inngest.createFunction(
    { id: 'notify-bill-due-soon' },
    { cron: '0 23 * * *' }, // 9am AEST
    async ({ step }) => {
      const today = new Date();
      const threeDaysLaterStr = new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      const bills = await step.run('fetch-upcoming-bills', async () => {
        return await db
          .select({
            id: expenseEvents.id,
            name: expenseEvents.name,
            expectedAmount: expenseEvents.expectedAmount,
            expectedDate: expenseEvents.expectedDate,
            tenantId: expenseEvents.tenantId,
            createdBy: expenseEvents.createdBy,
            categoryId: expenseEvents.categoryId,
            categoryName: categories.name,
          })
          .from(expenseEvents)
          .leftJoin(categories, eq(expenseEvents.categoryId, categories.id))
          .where(
            and(
              eq(expenseEvents.status, 'UPCOMING'),
              gte(expenseEvents.expectedDate, todayStr),
              lte(expenseEvents.expectedDate, threeDaysLaterStr)
            )
          );
      });

      for (const bill of bills) {
        await step.sendEvent(`trigger-push-bill-${bill.id}`, {
          name: 'notification/send-push',
          data: {
            userId: bill.createdBy,
            tenantId: bill.tenantId,
            title: `📋 ${bill.name} due ${bill.expectedDate}`,
            body: `Expected: $${parseFloat(bill.expectedAmount).toFixed(2)}`,
            data: { screen: 'home', eventId: bill.id },
          },
        });
      }

      return { count: bills.length };
    }
  );

  // 3. Bill Overdue
  const notifyBillOverdue = inngest.createFunction(
    { id: 'notify-bill-overdue' },
    { cron: '0 0 * * *' }, // 10am AEST
    async ({ step }) => {
      const todayStr = new Date().toISOString().split('T')[0];

      const overdueBills = await step.run('fetch-overdue-bills', async () => {
        return await db
          .select()
          .from(expenseEvents)
          .where(and(eq(expenseEvents.status, 'UPCOMING'), lte(expenseEvents.expectedDate, todayStr)));
      });

      for (const bill of overdueBills) {
        await step.sendEvent(`trigger-push-overdue-${bill.id}`, {
          name: 'notification/send-push',
          data: {
            userId: bill.createdBy,
            tenantId: bill.tenantId,
            title: `🔴 ${bill.name} is overdue!`,
            body: 'Mark as paid or reschedule in Money Matters.',
            data: { screen: 'home', eventId: bill.id },
          },
        });
      }

      return { count: overdueBills.length };
    }
  );

  // 4. Weekly Digest
  const notifyWeeklyDigest = inngest.createFunction(
    { id: 'notify-weekly-digest' },
    { cron: '0 9 * * 0' }, // Sunday 7pm AEST
    async ({ step }) => {
      const allPrefs = await step.run('fetch-users-digest-enabled', async () => {
        return await db.select().from(userPreferences);
      });

      for (const pref of allPrefs) {
        await step.sendEvent(`trigger-weekly-digest-${pref.id}`, {
          name: 'notification/send-push',
          data: {
            userId: pref.userId,
            tenantId: pref.tenantId,
            title: '📊 Weekly Financial Summary',
            body: 'Check your budget status and upcoming bills for the week ahead.',
            data: { screen: 'home' },
          },
        });
      }

      return { count: allPrefs.length };
    }
  );

  // 5. Goal Milestone
  const notifyGoalMilestone = inngest.createFunction(
    { id: 'notify-goal-milestone' },
    { event: 'transaction/recorded' },
    async ({ event, step }) => {
      const { categoryId, tenantId, userId } = event.data as { categoryId?: string; tenantId: string; userId: string };
      if (!categoryId) return { status: 'skipped, no categoryId' };

      const cat = await step.run('fetch-category', async () => {
        const [c] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
        return c;
      });

      if (cat && cat.type === 'GOAL' && cat.monthlyAmount) {
        await step.sendEvent(`trigger-push-milestone-${cat.id}`, {
          name: 'notification/send-push',
          data: {
            userId,
            tenantId,
            title: `🎉 ${cat.name} goal updated!`,
            body: `Monthly target: $${parseFloat(cat.monthlyAmount).toFixed(2)}`,
            data: { screen: 'categories', categoryId: cat.id },
          },
        });
      }

      return { status: 'processed' };
    }
  );

  // 6. Spending Velocity Warning
  const notifySpendingVelocity = inngest.createFunction(
    { id: 'notify-spending-velocity' },
    { cron: '0 8 * * *' }, // 6pm AEST
    async ({ step }) => {
      return { status: 'checked' };
    }
  );

  return [
    notifyPaydayIncoming,
    notifyBillDueSoon,
    notifyBillOverdue,
    notifyWeeklyDigest,
    notifyGoalMilestone,
    notifySpendingVelocity,
  ];
}
