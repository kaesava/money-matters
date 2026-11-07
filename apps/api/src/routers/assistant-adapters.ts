import { eq, and, sql, asc, or } from "drizzle-orm";
import { envelopes, incomeEvents, incomeSources, bankAccounts, DbOrTx, getEnvelopeBalancesMap } from "@money-matters/db";
import { listBillCoverageQuery, previewPaydayQuery } from "@money-matters/capability-budgeting";
import type { IntentHandlerPort, IntentContext } from "@money-matters/capability-assistant";
import type { AssistantResult } from "@money-matters/types";

export function createAssistantIntentHandler(db: DbOrTx, appId: string): IntentHandlerPort {
  return {
    async handleGoalDate(ctx: IntentContext, goalName?: string): Promise<AssistantResult> {
      const rawRows = await db
        .select({
          envelope: envelopes,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(envelopes.tenantId, ctx.tenantId),
            sql`${envelopes.envelopeType} IN ('TARGET_GOAL', 'ONGOING_GOAL')`,
            sql`${envelopes.archivedAt} IS NULL`
          )
        );

      const rows = rawRows
        .filter((r) => {
          if (r.envelope.isPrivate && r.envelope.userId !== ctx.userId) return false;
          if (r.bankAccountIsPrivate && r.bankAccountUserId !== ctx.userId) return false;
          return true;
        })
        .map((r) => r.envelope);

      const target = goalName
        ? rows.find((r) => r.name.toLowerCase().includes(goalName.toLowerCase())) || rows[0]
        : rows[0];

      if (!target) {
        return {
          type: "answer",
          templateKey: "assistant.answers.noGoalFound",
          templateValues: { goal: goalName ?? "" },
        };
      }

      const balancesMap = await getEnvelopeBalancesMap(ctx.tenantId, appId, db);
      const targetAmount = parseFloat(target.targetAmount || "0");
      const currentBalance = balancesMap[target.id] ?? 0;

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
      const rawRows = await db
        .select({
          envelope: envelopes,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(envelopes.tenantId, ctx.tenantId),
            eq(envelopes.envelopeType, "EVERYDAY"),
            sql`${envelopes.archivedAt} IS NULL`
          )
        );

      const rows = rawRows
        .filter((r) => {
          if (r.envelope.isPrivate && r.envelope.userId !== ctx.userId) return false;
          if (r.bankAccountIsPrivate && r.bankAccountUserId !== ctx.userId) return false;
          return true;
        })
        .map((r) => r.envelope);

      const everyday = rows[0];
      const balancesMap = await getEnvelopeBalancesMap(ctx.tenantId, appId, db);
      const balance = everyday ? (balancesMap[everyday.id] ?? 0) : 0;

      return {
        type: "answer",
        templateKey: "assistant.answers.poolBalance",
        templateValues: {
          envelopeName: poolName,
          balance,
        },
      };
    },

    async handleNextPayday(ctx: IntentContext): Promise<AssistantResult> {
      try {
        const events = await db
          .select({
            event: incomeEvents,
            bankAccountIsPrivate: bankAccounts.isPrivate,
            bankAccountUserId: bankAccounts.userId,
          })
          .from(incomeEvents)
          .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
          .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
          .where(
            and(
              eq(incomeEvents.tenantId, ctx.tenantId),
              eq(incomeEvents.status, "PENDING"),
              sql`${incomeEvents.archivedAt} IS NULL`
            )
          )
          .orderBy(asc(incomeEvents.expectedDate));

        const visibleEvents = events.filter((e) => {
          if (e.bankAccountIsPrivate && e.bankAccountUserId !== ctx.userId) return false;
          return true;
        });

        const nextEvent = visibleEvents[0]?.event;

        if (!nextEvent) {
          return {
            type: "answer",
            templateKey: "assistant.answers.nextPaydayNotScheduled",
          };
        }

        const preview = await previewPaydayQuery(nextEvent.id, ctx.tenantId, appId, db, ctx.userId);
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
        ? coverage.items.find((b) => b.envelopeName.toLowerCase().includes(billName.toLowerCase()))
        : null;

      if (!matched) {
        return {
          type: "answer",
          templateKey: "assistant.answers.billStatusNotFound",
          templateValues: { bill: billName ?? "" },
        };
      }

      // If coverageStatus is COVERED, check if there are pending events or if confirmed
      const templateKey =
        matched.coverageStatus === "COVERED"
          ? "assistant.answers.billCovered"
          : "assistant.answers.billUnpaid";

      return {
        type: "answer",
        templateKey,
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
