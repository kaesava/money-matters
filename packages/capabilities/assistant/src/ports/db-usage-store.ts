import { sql, eq, and } from "drizzle-orm";
import { aiUsage, DbOrTx } from "@money-matters/db";
import { AI_TIER_LIMITS } from "@money-matters/config";
import type { UsageStorePort } from "./index.js";

function getCurrentPeriodMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}-01`;
}

function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const year = nextMonth.getUTCFullYear();
  const month = (nextMonth.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}-01`;
}

export class DbUsageStore implements UsageStorePort {
  constructor(private db: DbOrTx) {}

  async getUsage(tenantId: string): Promise<{ used: number; limit: number; remaining: number; resetsOn: string }> {
    const periodMonth = getCurrentPeriodMonth();
    const limit = AI_TIER_LIMITS.free.monthlyLlmCalls;

    const [row] = await this.db
      .select({ llmCalls: aiUsage.llmCalls })
      .from(aiUsage)
      .where(and(eq(aiUsage.tenantId, tenantId), eq(aiUsage.periodMonth, periodMonth)))
      .limit(1);

    const used = row?.llmCalls ?? 0;
    const remaining = Math.max(0, limit - used);

    return {
      used,
      limit,
      remaining,
      resetsOn: getNextResetDate(),
    };
  }

  async incrementLlmCalls(tenantId: string, limit: number): Promise<boolean> {
    const periodMonth = getCurrentPeriodMonth();

    // Atomic conditional upsert protecting against race conditions
    const result = await this.db
      .insert(aiUsage)
      .values({
        tenantId,
        periodMonth,
        llmCalls: 1,
      })
      .onConflictDoUpdate({
        target: [aiUsage.tenantId, aiUsage.periodMonth],
        set: {
          llmCalls: sql`${aiUsage.llmCalls} + 1`,
          updatedAt: new Date(),
        },
        where: sql`${aiUsage.llmCalls} < ${limit}`,
      })
      .returning({ id: aiUsage.id });

    return result.length > 0;
  }

  async decrementLlmCalls(tenantId: string): Promise<void> {
    const periodMonth = getCurrentPeriodMonth();
    await this.db
      .update(aiUsage)
      .set({
        llmCalls: sql`GREATEST(0, ${aiUsage.llmCalls} - 1)`,
        updatedAt: new Date(),
      })
      .where(and(eq(aiUsage.tenantId, tenantId), eq(aiUsage.periodMonth, periodMonth)));
  }
}
