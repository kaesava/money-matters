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
      const tenantMembers = await step.run('fetch-active-tenant-members', async () => {
        const { tenants, tenantUsers, users } = await import('@money-matters/db');
        const { eq, and, inArray } = await import('drizzle-orm');
        return await db
          .select({
            tenantId: tenants.id,
            tenantName: tenants.name,
            email: users.email,
          })
          .from(tenants)
          .innerJoin(tenantUsers, and(eq(tenantUsers.tenantId, tenants.id), sql`${tenantUsers.archivedAt} IS NULL`))
          .innerJoin(users, eq(tenantUsers.userId, users.id))
          .where(
            and(
              sql`${tenants.archivedAt} IS NULL`,
              inArray(tenants.subscriptionStatus, ['TRIAL_ACTIVE', 'SUBSCRIBED'])
            )
          );
      });

      const CHUNK_SIZE = 50;
      for (let i = 0; i < tenantMembers.length; i += CHUNK_SIZE) {
        const chunk = tenantMembers.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE);
        await step.run(`send-weekly-digest-batch-${chunkIndex}`, async () => {
          await Promise.all(
            chunk.map(async (record) => {
              if (!record.email) return;
              await sendNotificationEmail(
                record.email,
                `Weekly Cashflow Summary — ${record.tenantName}`,
                `Here is your weekly budget summary for ${record.tenantName}.\n\nLog in to Money Matters to review your Payday Split and forward-looking bill allocations!`
              );
            })
          );
        });
      }

      return { digestsSent: tenantMembers.length };
    }
  );

  return [
    notifyWeeklyDigest,
  ];
}


