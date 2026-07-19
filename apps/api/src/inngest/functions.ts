import { inngest } from "./client.js";
import { seedMoneysmartCategories } from "@money-matters/capability-money";
import { validateEnv } from "@money-matters/config";

export const handleUserSignup = inngest.createFunction(
  { id: "seed-on-signup" },
  { event: "auth/user.signup" },
  async ({ event }) => {
    const env = validateEnv();
    await seedMoneysmartCategories(event.data.tenantId, env.APP_MONEY_MATTERS_ID, event.data.userId);
    return { status: "Moneysmart categories provisioned." };
  }
);

import { createNotificationFunctions } from "@money-matters/capability-notifications";
export const notificationFunctions = createNotificationFunctions(inngest);

import { db, savingsReconciliations, tenantUsers } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export const notifyReconciliationDue = inngest.createFunction(
  { id: 'notify-reconciliation-due' },
  { cron: '0 10 1 * *' }, // 10am on the 1st of every month
  async ({ step }) => {
    // 1. Fetch all tenant relations
    const relations = await step.run('fetch-tenants-users', async () => {
      return await db.select({ tenantId: tenantUsers.tenantId, userId: tenantUsers.userId }).from(tenantUsers);
    });

    const results = [];
    for (const rel of relations) {
      // 2. Query last reconciliation date
      const [lastRec] = await step.run(`check-reconcile-${rel.tenantId}`, async () => {
        return await db
          .select()
          .from(savingsReconciliations)
          .where(eq(savingsReconciliations.tenantId, rel.tenantId))
          .orderBy(sql`${savingsReconciliations.reconciledAt} DESC`)
          .limit(1);
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (!lastRec || new Date(lastRec.reconciledAt).getTime() < thirtyDaysAgo.getTime()) {
        await step.run(`dispatch-remind-${rel.tenantId}`, async () => {
          await inngest.send({
            name: 'notification/send-push',
            data: {
              userId: rel.userId,
              tenantId: rel.tenantId,
              title: "Time to Reconcile",
              body: "It's been 30 days since your last reconciliation. Tap to check your savings balance.",
              data: { screen: 'reconcile' },
            },
          });
        });
        results.push({ tenantId: rel.tenantId, notified: true });
      }
    }
    return { processed: relations.length, details: results };
  }
);

