import { Inngest } from 'inngest';
import { db } from '@money-matters/db';
import { sql } from 'drizzle-orm';
import { sendNotificationEmail } from '@money-matters/core';

export function createScheduledNotificationFunctions(inngest: Inngest) {
  if (!inngest) {
    console.warn('[Inngest] Client not initialized, skipping scheduled notification registrations.');
    return [];
  }

  /**
   * Weekly Digest — fires Sunday 9:00 AM UTC = Sunday 7:00 PM AEST (UTC+10).
   * Sends a summary cashflow email to all active tenant members.
   * V2 scheduled crons (payday alert, shortfall, bill reminder, spending velocity, goal milestone)
   * are documented in V2_SCOPE.md and must NOT be added here until fully designed with tenant scoping.
   */
  const notifyWeeklyDigest = inngest.createFunction(
    { id: 'notify-weekly-digest' },
    // Sunday 9:00 AM UTC = Sunday 7:00 PM AEST (UTC+10) — see AGENTS.md Rule 13
    { cron: '0 9 * * 0' },
    async ({ step }) => {
      const activeTenants = await step.run('fetch-active-tenants', async () => {
        const { tenants } = await import('@money-matters/db');
        return await db.select().from(tenants);
      });

      for (const tenant of activeTenants) {
        await step.run(`send-weekly-digest-email-${tenant.id}`, async () => {
          const { tenantUsers, users } = await import('@money-matters/db');
          const { eq, and } = await import('drizzle-orm');
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

  return [
    notifyWeeklyDigest,
  ];
}


