import { eq, and, asc, sql } from "drizzle-orm";
import {
  incomeEvents,
  incomeSources,
  bankAccounts,
  expenseEvents,
  getEnvelopeBalancesMap,
  type DbOrTx,
} from "@money-matters/db";
import { listBillCoverageQuery, previewPaydayQuery } from "@money-matters/capability-budgeting";
import { getTenantDateString } from "@money-matters/core";
import type { IntentHandlerPort, IntentContext } from "@money-matters/capability-assistant";
import type { AssistantResult } from "@money-matters/types";
import {
  buildSafePennyContext,
  fetchVisibleEnvelopes,
  fmtAmt,
  fmtDt,
  loadTenantFormatting,
  resolveEditableEntity,
} from "./assistant-context.js";

async function goalDateAnswer(
  db: DbOrTx,
  appId: string,
  ctx: IntentContext,
  goalName?: string
): Promise<AssistantResult> {
  const [fmt, visible] = await Promise.all([
    loadTenantFormatting(db, ctx.tenantId),
    fetchVisibleEnvelopes(db, ctx.tenantId, appId, ctx.userId),
  ]);
  const goals = visible.filter((r) => r.envelopeType === "GOAL");
  const target = goalName
    ? goals.find((r) => r.name.toLowerCase().includes(goalName.trim().toLowerCase()))
    : goals[0];

  if (!target) {
    return { type: "answer", templateKey: "assistant.answers.noGoalFound", templateValues: { goal: goalName ?? "" } };
  }

  const balancesMap = await getEnvelopeBalancesMap(ctx.tenantId, appId, db);
  const targetAmt = fmtAmt(parseFloat(target.targetAmount || "0"), fmt);
  const currentBal = fmtAmt(balancesMap[target.id] ?? 0, fmt);
  if (!target.endDate) {
    return {
      type: "answer",
      templateKey: "assistant.answers.goalNoTargetDate",
      templateValues: { goal: target.name, balance: currentBal, target: targetAmt },
    };
  }
  return {
    type: "answer",
    templateKey: "assistant.answers.goalProjection",
    templateValues: { goal: target.name, date: fmtDt(target.endDate, fmt), target: targetAmt, balance: currentBal },
  };
}

async function poolBalanceAnswer(
  db: DbOrTx,
  appId: string,
  ctx: IntentContext,
  poolName?: string
): Promise<AssistantResult> {
  const [fmt, rows, balancesMap] = await Promise.all([
    loadTenantFormatting(db, ctx.tenantId),
    fetchVisibleEnvelopes(db, ctx.tenantId, appId, ctx.userId),
    getEnvelopeBalancesMap(ctx.tenantId, appId, db),
  ]);

  const queryLower = (poolName ?? "everyday").trim().toLowerCase();
  const matched =
    rows.find((e) => e.name.toLowerCase().includes(queryLower)) ??
    (queryLower === "everyday" || !poolName ? rows.find((e) => e.envelopeType === "EVERYDAY") : undefined);

  if (!matched) {
    return {
      type: "answer",
      templateKey: "assistant.answers.poolNotFound",
      templateValues: { envelopeName: poolName?.trim() || "Everyday" },
    };
  }
  return {
    type: "answer",
    templateKey: "assistant.answers.poolBalance",
    templateValues: { envelopeName: matched.name, balance: fmtAmt(balancesMap[matched.id] ?? 0, fmt) },
  };
}

async function nextPaydayAnswer(db: DbOrTx, appId: string, ctx: IntentContext): Promise<AssistantResult> {
  try {
    const [fmt, events] = await Promise.all([
      loadTenantFormatting(db, ctx.tenantId),
      db
        .select({ event: incomeEvents, isPriv: bankAccounts.isPrivate, ownerId: bankAccounts.userId })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(
          and(
            eq(incomeEvents.tenantId, ctx.tenantId),
            eq(incomeEvents.appId, appId),
            eq(incomeEvents.status, "PENDING"),
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        )
        .orderBy(asc(incomeEvents.expectedDate)),
    ]);

    const nextEvent = events.find((e) => !e.isPriv || e.ownerId === ctx.userId)?.event;
    if (!nextEvent) {
      return { type: "answer", templateKey: "assistant.answers.nextPaydayNotScheduled" };
    }
    const preview = await previewPaydayQuery(nextEvent.id, ctx.tenantId, appId, db, ctx.userId);
    return {
      type: "answer",
      templateKey: "assistant.answers.nextPayday",
      templateValues: { date: fmtDt(nextEvent.expectedDate, fmt), amount: fmtAmt(preview.expectedAmount ?? 0, fmt) },
    };
  } catch {
    return { type: "answer", templateKey: "assistant.answers.nextPaydayNotScheduled" };
  }
}

async function billsDueAnswer(
  db: DbOrTx,
  appId: string,
  ctx: IntentContext,
  daysAhead = 7
): Promise<AssistantResult> {
  const [fmt, visible] = await Promise.all([
    loadTenantFormatting(db, ctx.tenantId),
    fetchVisibleEnvelopes(db, ctx.tenantId, appId, ctx.userId),
  ]);
  const visibleIds = new Set(visible.map((e) => e.id));
  const todayStr = getTenantDateString(new Date(), fmt);
  const horizonStr = getTenantDateString(new Date(Date.now() + Math.max(0, daysAhead) * 86400000), fmt);

  const rows = await db
    .select({ name: expenseEvents.name, amount: expenseEvents.expectedAmount, date: expenseEvents.expectedDate, envelopeId: expenseEvents.envelopeId })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, ctx.tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.expectedDate} >= ${todayStr}`,
        sql`${expenseEvents.expectedDate} <= ${horizonStr}`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(expenseEvents.expectedDate));

  const due = rows.filter((r) => visibleIds.has(r.envelopeId));
  if (due.length === 0) {
    return { type: "answer", templateKey: "assistant.answers.noPendingBillsDue", templateValues: { days: daysAhead } };
  }
  const total = due.reduce((s, r) => s + parseFloat(r.amount), 0);
  const billsList = due.slice(0, 3).map((r) => `${r.name} (${fmtAmt(r.amount, fmt)})`).join(", ");
  const suffix = due.length > 3 ? ` +${due.length - 3}` : "";
  return {
    type: "answer",
    templateKey: "assistant.answers.billsDueWithDetails",
    templateValues: { count: due.length, days: daysAhead, total: fmtAmt(total, fmt), bills: `${billsList}${suffix}` },
  };
}

async function billCoverageAnswer(
  db: DbOrTx,
  appId: string,
  ctx: IntentContext,
  billName?: string
): Promise<AssistantResult> {
  const [fmt, coverage] = await Promise.all([
    loadTenantFormatting(db, ctx.tenantId),
    listBillCoverageQuery(ctx.tenantId, appId, db, ctx.userId),
  ]);
  const q = billName?.trim().toLowerCase();
  const matched = q ? coverage.items.find((b) => b.envelopeName.toLowerCase().includes(q)) : undefined;
  if (!matched) {
    return { type: "answer", templateKey: "assistant.answers.billStatusNotFound", templateValues: { bill: billName ?? "" } };
  }
  const templateKey =
    matched.coverageStatus === "COVERED" ? "assistant.answers.billCovered" : "assistant.answers.billUnpaid";
  return {
    type: "answer",
    templateKey,
    templateValues: { bill: matched.envelopeName, amount: fmtAmt(matched.nextDueAmount ?? matched.monthlyAmount ?? 0, fmt) },
  };
}

async function spendingSummaryPrefill(
  db: DbOrTx,
  appId: string,
  ctx: IntentContext,
  categoryName?: string
): Promise<AssistantResult> {
  const q = categoryName?.trim().toLowerCase();
  if (!q) {
    return { type: "prefill", target: "history-filter", params: { category: "" } };
  }
  const visible = await fetchVisibleEnvelopes(db, ctx.tenantId, appId, ctx.userId);
  const matched = visible.find((e) => e.name.toLowerCase().includes(q));
  return {
    type: "prefill",
    target: "history-filter",
    params: {
      category: categoryName?.trim() ?? "",
      ...(matched ? { envelopeId: matched.id } : {}),
    },
  };
}

export function createAssistantIntentHandler(db: DbOrTx, appId: string): IntentHandlerPort {
  return {
    handleGoalDate: (ctx, goalName) => goalDateAnswer(db, appId, ctx, goalName),
    handlePoolBalance: (ctx, poolName) => poolBalanceAnswer(db, appId, ctx, poolName),
    handleNextPayday: (ctx) => nextPaydayAnswer(db, appId, ctx),
    handleBillsDue: (ctx, daysAhead) => billsDueAnswer(db, appId, ctx, daysAhead),
    handleBillCoverage: (ctx, billName) => billCoverageAnswer(db, appId, ctx, billName),
    handleSpendingSummary: (ctx, categoryName) => spendingSummaryPrefill(db, appId, ctx, categoryName),
    buildSafeContext: (ctx) => buildSafePennyContext(db, appId, ctx),
    async resolveEditTarget(ctx, entityType, entityName): Promise<AssistantResult> {
      const matched = await resolveEditableEntity(db, appId, ctx, entityType, entityName);
      if (!matched) {
        return { type: "prefill", target: "navigate", params: { screen: entityType === "envelope" ? "envelopes" : "plan" } };
      }
      return {
        type: "prefill",
        target: `edit-${entityType}`,
        params: { id: matched.id, name: matched.name },
      };
    },
  };
}
