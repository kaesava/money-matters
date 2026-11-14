import { and, asc, eq, gte, sql } from "drizzle-orm";
import {
  bankAccounts,
  envelopes,
  expenseEvents,
  getEnvelopeBalancesMap,
  incomeEvents,
  incomeSources,
  tenants,
  type DbOrTx,
} from "@money-matters/db";
import {
  formatCurrency,
  formatDate,
  getLocaleFromCountry,
  getTenantDateString,
  type FormatterTenant,
} from "@money-matters/core";
import type { IntentContext, SafePennySnapshot } from "@money-matters/capability-assistant";

export interface TenantFormatting extends FormatterTenant {
  country: string;
  currency: string;
  timezone: string;
  locale: string;
}

export interface VisibleEnvelopeRow {
  id: string;
  name: string;
  envelopeType: "EVERYDAY" | "BILL" | "GOAL";
  monthlyAmount: string | null;
  targetAmount: string | null;
  endDate: string | null;
  isSurplusTarget: boolean;
}

export async function loadTenantFormatting(db: DbOrTx, tenantId: string): Promise<TenantFormatting> {
  const [row] = await db
    .select({ country: tenants.country, currency: tenants.currency, timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const country = row?.country ?? "AU";
  const currency = row?.currency ?? "AUD";
  const timezone = row?.timezone ?? "Australia/Sydney";
  return { country, currency, timezone, locale: getLocaleFromCountry(country) };
}

export function fmtAmt(amount: number | string, fmt: TenantFormatting): string {
  return formatCurrency(amount, fmt) || String(amount);
}

export function fmtDt(dateStr: string, fmt: TenantFormatting): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T12:00:00Z` : dateStr;
  return formatDate(normalized, fmt) || dateStr;
}

export async function fetchVisibleEnvelopes(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  userId: string
): Promise<VisibleEnvelopeRow[]> {
  const rows = await db
    .select({
      envelope: envelopes,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), sql`${envelopes.archivedAt} IS NULL`));

  return rows
    .filter((r) => {
      if (r.envelope.isPrivate && r.envelope.userId !== userId) return false;
      if (r.bankAccountIsPrivate && r.bankAccountUserId !== userId) return false;
      return true;
    })
    .map((r) => ({
      id: r.envelope.id,
      name: r.envelope.name,
      envelopeType: r.envelope.envelopeType,
      monthlyAmount: r.envelope.monthlyAmount,
      targetAmount: r.envelope.targetAmount,
      endDate: r.envelope.endDate,
      isSurplusTarget: r.envelope.isSurplusTarget,
    }));
}

async function fetchUpcomingSafeBills(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  visibleIds: Set<string>,
  todayIso: string,
  fmt: TenantFormatting
): Promise<SafePennySnapshot["upcomingBills"]> {
  const rows = await db
    .select({
      name: expenseEvents.name,
      amount: expenseEvents.expectedAmount,
      date: expenseEvents.expectedDate,
      status: expenseEvents.status,
      envelopeId: expenseEvents.envelopeId,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "PENDING"),
        gte(expenseEvents.expectedDate, todayIso),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(expenseEvents.expectedDate))
    .limit(24);

  return rows
    .filter((r) => visibleIds.has(r.envelopeId))
    .slice(0, 12)
    .map((r) => ({ name: r.name ?? "", amount: fmtAmt(r.amount, fmt), date: fmtDt(r.date, fmt), status: r.status }));
}

async function fetchUpcomingSafeIncome(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  userId: string,
  todayIso: string,
  fmt: TenantFormatting
): Promise<SafePennySnapshot["upcomingIncome"]> {
  const rows = await db
    .select({
      name: incomeEvents.name,
      amount: incomeEvents.expectedAmount,
      date: incomeEvents.expectedDate,
      status: incomeEvents.status,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(
      and(
        eq(incomeEvents.tenantId, tenantId),
        eq(incomeEvents.appId, appId),
        eq(incomeEvents.status, "PENDING"),
        gte(incomeEvents.expectedDate, todayIso),
        sql`${incomeEvents.archivedAt} IS NULL`
      )
    )
    .orderBy(asc(incomeEvents.expectedDate))
    .limit(12);

  return rows
    .filter((r) => !r.bankAccountIsPrivate || r.bankAccountUserId === userId)
    .slice(0, 5)
    .map((r) => ({ name: r.name ?? "", amount: fmtAmt(r.amount, fmt), date: fmtDt(r.date, fmt), status: r.status }));
}

export async function buildSafePennyContext(
  db: DbOrTx,
  appId: string,
  ctx: IntentContext
): Promise<SafePennySnapshot> {
  const fmt = await loadTenantFormatting(db, ctx.tenantId);
  const todayIso = getTenantDateString(new Date(), fmt);
  const [visibleEnvs, balancesMap] = await Promise.all([
    fetchVisibleEnvelopes(db, ctx.tenantId, appId, ctx.userId),
    getEnvelopeBalancesMap(ctx.tenantId, appId, db),
  ]);
  const visibleIds = new Set(visibleEnvs.map((e) => e.id));
  const [upcomingBills, upcomingIncome] = await Promise.all([
    fetchUpcomingSafeBills(db, ctx.tenantId, appId, visibleIds, todayIso, fmt),
    fetchUpcomingSafeIncome(db, ctx.tenantId, appId, ctx.userId, todayIso, fmt),
  ]);

  const everydayTotal = visibleEnvs
    .filter((e) => e.envelopeType === "EVERYDAY")
    .reduce((sum, e) => sum + (balancesMap[e.id] ?? 0), 0);

  return {
    currency: fmt.currency,
    timezone: fmt.timezone,
    todayIso,
    everydaySafeToSpend: fmtAmt(everydayTotal, fmt),
    envelopes: visibleEnvs.slice(0, 30).map((e) => ({
      name: e.name,
      type: e.envelopeType,
      balance: fmtAmt(balancesMap[e.id] ?? 0, fmt),
      ...(e.monthlyAmount ? { monthlyBudget: fmtAmt(e.monthlyAmount, fmt) } : {}),
      ...(e.targetAmount ? { targetAmount: fmtAmt(e.targetAmount, fmt) } : {}),
      ...(e.endDate ? { endDate: fmtDt(e.endDate, fmt) } : {}),
    })),
    upcomingBills,
    upcomingIncome,
  };
}

export async function resolveEditableEntity(
  db: DbOrTx,
  appId: string,
  ctx: IntentContext,
  entityType: "envelope" | "bill" | "income",
  entityName?: string
): Promise<{ id: string; name: string } | null> {
  const q = entityName?.trim().toLowerCase() ?? "";
  if (entityType === "income") {
    const rows = await db
      .select({
        id: incomeSources.id,
        name: incomeSources.name,
        bankAccountIsPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(incomeSources)
      .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
      .where(
        and(eq(incomeSources.tenantId, ctx.tenantId), eq(incomeSources.appId, appId), sql`${incomeSources.archivedAt} IS NULL`)
      );
    const visible = rows.filter((r) => !r.bankAccountIsPrivate || r.bankAccountUserId === ctx.userId);
    const found = q ? visible.find((r) => r.name.toLowerCase().includes(q)) : visible[0];
    return found ? { id: found.id, name: found.name } : null;
  }

  const visible = await fetchVisibleEnvelopes(db, ctx.tenantId, appId, ctx.userId);
  const scoped = entityType === "bill" ? visible.filter((e) => e.envelopeType === "BILL") : visible;
  const matched = q ? scoped.find((e) => e.name.toLowerCase().includes(q)) : scoped[0];
  return matched ? { id: matched.id, name: matched.name } : null;
}
