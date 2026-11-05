import { Inngest } from 'inngest';
import { db, processedWebhooks, aiUsage } from '@money-matters/db';
import { lt, sql } from 'drizzle-orm';
import { logger } from '@money-matters/core';

export function createRetentionWorkflows(inngest: Inngest) {
  if (!inngest) {
    return [];
  }

  const pruneRetention = inngest.createFunction(
    { id: 'system-prune-retention' },
    { cron: '0 3 * * *' }, // Daily at 3:00 AM UTC
    async ({ step }) => {
      // 1. Prune processed webhooks older than 90 days
      const prunedWebhooksCount = await step.run('prune-processed-webhooks', async () => {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const result = await db
          .delete(processedWebhooks)
          .where(lt(processedWebhooks.processedAt, ninetyDaysAgo));
        return result;
      });

      // 2. Prune AI usage logs older than 395 days (13 months)
      const prunedAiUsageCount = await step.run('prune-ai-usage', async () => {
        const thirteenMonthsAgoStr = new Date(Date.now() - 395 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const result = await db
          .delete(aiUsage)
          .where(sql`${aiUsage.periodMonth} < ${thirteenMonthsAgoStr}`);
        return result;
      });

      logger.info('[Retention] Pruned retention records cleanly', {
        prunedWebhooksCount,
        prunedAiUsageCount,
      });

      return { success: true };
    }
  );

  return [pruneRetention];
}
