import { eq, and, sql, desc } from "drizzle-orm";
import { envelopes, incomeEvents } from "@money-matters/db";
import { listBillCoverageQuery, previewPaydayQuery } from "@money-matters/capability-budgeting";
import type { IntentHandlerPort, IntentContext } from "@money-matters/capability-assistant";
import type { AssistantResult } from "@money-matters/types";

export function createAssistantIntentHandler(db: any, appId: string): IntentHandlerPort {
  return {
    async handleGoalDate(ctx: IntentContext, goalName?: string): Promise<AssistantResult> {
      const rows = await db
        .select()
        .from(envelopes)
        .where(
          and(
            eq(envelopes.tenantId, ctx.tenantId),
            sql`${envelopes.envelopeType} IN ('TARGET_GOAL', 'ONGOING_GOAL')`
          )
        );

      const target = goalName
        ? rows.find((r: any) => r.name.toLowerCase().includes(goalName.toLowerCase())) || rows[0]
        : rows[0];

      if (!target) {
        return {
          type: "answer",
          templateKey: "assistant.answers.noGoalFound",
          templateValues: { goal: goalName ?? "" },
        };
      }

      const targetAmount = parseFloat(target.targetAmount || "0");
      const currentBalance = parseFloat(target.monthlyAmount || "0");

      return {
        type: "answer",
        templateKey: "assistant.answers.goalProjection",
        templateValues: {
          goal: target.name,
          date: target.endDate || "2026-12-31",
          target: targetAmount,
          balance: currentBalance,
        },
      };
    },

    async handlePoolBalance(ctx: IntentContext, poolName = "Everyday"): Promise<AssistantResult> {
      const rows = await db
        .select()
        .from(envelopes)
        .where(
          and(
            eq(envelopes.tenantId, ctx.tenantId),
            eq(envelopes.envelopeType, "EVERYDAY")
          )
        );

      const everyday = rows[0];
      const balance = everyday ? parseFloat(everyday.monthlyAmount || "0") : 0;

      return {
        type: "answer",
        templateKey: "assistant.answers.poolBalance",
        templateValues: {
          pool: poolName,
          balance,
        },
      };
    },

    async handleNextPayday(ctx: IntentContext): Promise<AssistantResult> {
      try {
        const [nextEvent] = await db
          .select()
          .from(incomeEvents)
          .where(and(eq(incomeEvents.tenantId, ctx.tenantId), eq(incomeEvents.status, "PENDING")))
          .orderBy(desc(incomeEvents.expectedDate))
          .limit(1);

        if (!nextEvent) {
          return {
            type: "answer",
            templateKey: "assistant.answers.nextPaydayNotScheduled",
          };
        }

        const preview = await previewPaydayQuery(nextEvent.id, ctx.tenantId, appId, db);
        return {
          type: "answer",
          templateKey: "assistant.answers.nextPayday",
          templateValues: {
            date: nextEvent.expectedDate,
            amount: preview.expectedAmount ?? 0,
          },
        };
      } catch {
        return {
          type: "answer",
          templateKey: "assistant.answers.nextPaydayNotScheduled",
        };
      }
    },

    async handleBillsDue(ctx: IntentContext, daysAhead = 7): Promise<AssistantResult> {
      const coverage = await listBillCoverageQuery(ctx.tenantId, appId, db, ctx.userId);
      const dueCount = coverage.items.length;
      return {
        type: "answer",
        templateKey: "assistant.answers.billsDue",
        templateValues: {
          count: dueCount,
          days: daysAhead,
        },
      };
    },

    async handleBillCoverage(ctx: IntentContext, billName?: string): Promise<AssistantResult> {
      const coverage = await listBillCoverageQuery(ctx.tenantId, appId, db, ctx.userId);
      const matched = billName
        ? coverage.items.find((b: any) => b.envelopeName.toLowerCase().includes(billName.toLowerCase()))
        : null;

      if (!matched) {
        return {
          type: "answer",
          templateKey: "assistant.answers.billStatusNotFound",
          templateValues: { bill: billName ?? "" },
        };
      }

      const isPaid = matched.coverageStatus === "COVERED";
      return {
        type: "answer",
        templateKey: isPaid ? "assistant.answers.billPaid" : "assistant.answers.billUnpaid",
        templateValues: {
          bill: matched.envelopeName,
          amount: matched.nextDueAmount ? parseFloat(matched.nextDueAmount) : 0,
        },
      };
    },

    async handleSpendingSummary(_ctx: IntentContext, categoryName?: string): Promise<AssistantResult> {
      return {
        type: "prefill",
        target: "history-filter",
        params: { category: categoryName ?? "" },
      };
    },
  };
}
