import { envelopes, incomeSources, incomeEvents, expenseEvents, bankAccounts, tenants, apps, DbOrTx } from "@money-matters/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { getTenantDateString } from "@money-matters/core";
import { burstEnvelopeEvents } from "./envelope-schedule.js";
import { burstIncomeEvents } from "./income-schedule.js";
import { DEFAULT_APP_FEATURE_FLAGS, DEFAULT_TIMEZONE } from "@money-matters/types";

export async function restoreItemCommand(
  itemId: string,
  itemType: "ENVELOPE" | "INCOME_SOURCE" | "BANK_ACCOUNT",
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  return dbClient.transaction(async (tx) => {
  const [tenantRecord] = await tx
    .select({ timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const tenantTz = tenantRecord?.timezone || DEFAULT_TIMEZONE;
  const getLocalDateString = (d: Date = new Date()) => getTenantDateString(d, { timezone: tenantTz });
  const todayStr = getLocalDateString();
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayStr = getLocalDateString(yesterday);

  if (itemType === "BANK_ACCOUNT") {
    const [acc] = await tx
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, itemId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));
    if (!acc) throw new Error("Bank account not found.");
    if (acc.isPrivate && acc.userId !== userId) {
      throw new Error("Access unauthorized or private account.");
    }
    if (acc.isPrivate) {
      const [appRecord] = await tx
        .select({ featureFlags: apps.featureFlags })
        .from(apps)
        .where(eq(apps.id, appId))
        .limit(1);
      const flags = appRecord?.featureFlags || DEFAULT_APP_FEATURE_FLAGS;
      if (!flags.privateMode) {
        throw new Error("Private Mode is currently disabled for this application. Private items cannot be restored.");
      }
    }

    const bankArchivedAt = acc.archivedAt;
    if (!bankArchivedAt) {
      return acc;
    }

    const [restoredAcc] = await tx
      .update(bankAccounts)
      .set({
        archivedAt: null,
        archivedBy: null,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bankAccounts.id, itemId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NOT NULL`
        )
      )
      .returning();

    if (!restoredAcc) {
      return acc;
    }

    // Cascade restore linked envelopes and income sources archived at timestamp T (within +-2 seconds)
    const archivedTimeMs = new Date(bankArchivedAt).getTime();
    const windowStart = new Date(archivedTimeMs - 2000);
    const windowEnd = new Date(archivedTimeMs + 2000);

    // Restore cascade envelopes
    const restoredEnvelopes = await tx
      .update(envelopes)
      .set({
        archivedAt: null,
        archivedBy: null,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId),
          eq(envelopes.bankAccountId, itemId),
          sql`${envelopes.archivedAt} IS NOT NULL`,
          gte(envelopes.archivedAt, windowStart),
          lte(envelopes.archivedAt, windowEnd)
        )
      )
      .returning();

    for (const env of restoredEnvelopes) {
      const amountVal = env.enteredAmount || env.monthlyAmount || "0.00";
      if (
        env.envelopeType === "BILL" &&
        env.fundingMode === "RECURRING" &&
        env.generateEvents !== false &&
        env.rrule &&
        env.startDate &&
        parseFloat(amountVal) > 0
      ) {
        const count = await burstEnvelopeEvents(tx, {
          envelopeId: env.id,
          name: env.name,
          amount: amountVal,
          rrule: env.rrule,
          startDate: env.startDate,
          endDate: env.endDate,
          tenantId,
          appId,
          userId,
          timeZone: tenantTz,
          afterDateStr: null,
        });
        if (count === 0) {
          await tx
            .update(envelopes)
            .set({ lastBurstDate: env.endDate || null, updatedAt: new Date(), updatedBy: userId })
            .where(eq(envelopes.id, env.id));
        }
      }
    }

    // Restore cascade income sources
    const restoredIncomes = await tx
      .update(incomeSources)
      .set({
        archivedAt: null,
        archivedBy: null,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(incomeSources.tenantId, tenantId),
          eq(incomeSources.appId, appId),
          eq(incomeSources.receivingAccountId, itemId),
          sql`${incomeSources.archivedAt} IS NOT NULL`,
          gte(incomeSources.archivedAt, windowStart),
          lte(incomeSources.archivedAt, windowEnd)
        )
      )
      .returning();

    for (const inc of restoredIncomes) {
      const startDate = inc.startDate || todayStr;
      if (inc.rrule) {
        const afterDateStr = startDate < todayStr ? yesterdayStr : null;
        await burstIncomeEvents(tx, {
          incomeSourceId: inc.id,
          name: inc.name,
          amount: inc.amount,
          rrule: inc.rrule,
          startDate,
          endDate: inc.endDate,
          contributionMode: inc.contributionMode,
          contributionValue: inc.contributionValue,
          tenantId,
          appId,
          userId,
          timeZone: tenantTz,
          afterDateStr,
        });
      } else {
        await tx.insert(incomeEvents).values({
          incomeSourceId: inc.id,
          name: inc.name,
          expectedDate: startDate,
          actualDate: startDate,
          expectedAmount: inc.amount,
          actualAmount: inc.amount,
          contributionMode: inc.contributionMode || "FULL",
          contributionValue: inc.contributionValue || null,
          status: "PENDING",
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

    return restoredAcc;
  }

  if (itemType === "ENVELOPE") {
    const [env] = await tx
      .select({
        envelope: envelopes,
        bankAccountArchivedAt: bankAccounts.archivedAt,
        bankAccountIsPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(envelopes)
      .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
      .where(and(eq(envelopes.id, itemId), eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId)));

    if (!env) throw new Error("Envelope not found.");
    const rawEnv = ("envelope" in env && env.envelope) ? env.envelope : (env as unknown as typeof envelopes.$inferSelect);
    const isEnvPrivate = Boolean(rawEnv.isPrivate);
    const envUserId = rawEnv.userId;
    if (
      (isEnvPrivate && envUserId !== userId) ||
      (env.bankAccountIsPrivate && env.bankAccountUserId !== userId)
    ) {
      throw new Error("Access unauthorized or private envelope.");
    }

    if (isEnvPrivate || env.bankAccountIsPrivate) {
      const [appRecord] = await tx
        .select({ featureFlags: apps.featureFlags })
        .from(apps)
        .where(eq(apps.id, appId))
        .limit(1);
      const flags = appRecord?.featureFlags || DEFAULT_APP_FEATURE_FLAGS;
      if (!flags.privateMode) {
        throw new Error("Private Mode is currently disabled for this application. Private items cannot be restored.");
      }
    }

    if (!rawEnv.archivedAt) {
      return rawEnv;
    }

    if (env.bankAccountArchivedAt) {
      throw new Error("Cannot restore envelope because its linked bank account is archived. Please restore the bank account first.");
    }

    const [restored] = await tx
      .update(envelopes)
      .set({
        archivedAt: null,
        archivedBy: null,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(envelopes.id, itemId),
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId),
          sql`${envelopes.archivedAt} IS NOT NULL`
        )
      )
      .returning();

    if (restored) {
      const amountVal = restored.enteredAmount || restored.monthlyAmount || "0.00";
      if (
        restored.envelopeType === "BILL" &&
        restored.fundingMode === "RECURRING" &&
        restored.generateEvents !== false &&
        restored.rrule &&
        restored.startDate &&
        parseFloat(amountVal) > 0
      ) {
        const count = await burstEnvelopeEvents(tx, {
          envelopeId: restored.id,
          name: restored.name,
          amount: amountVal,
          rrule: restored.rrule,
          startDate: restored.startDate,
          endDate: restored.endDate,
          tenantId,
          appId,
          userId,
          timeZone: tenantTz,
          afterDateStr: null,
        });
        if (count === 0) {
          await tx
            .update(envelopes)
            .set({ lastBurstDate: restored.endDate || null, updatedAt: new Date(), updatedBy: userId })
            .where(eq(envelopes.id, restored.id));
        }
      }
    }

    return restored;
  }

  if (itemType === "INCOME_SOURCE") {
    const [inc] = await tx
      .select({
        incomeSource: incomeSources,
        bankAccountArchivedAt: bankAccounts.archivedAt,
        bankAccountIsPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(incomeSources)
      .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
      .where(and(eq(incomeSources.id, itemId), eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

    if (!inc) throw new Error("Income source not found.");
    if (inc.bankAccountIsPrivate && inc.bankAccountUserId !== userId) {
      throw new Error("Access unauthorized or private income source.");
    }

    if (!inc.incomeSource.archivedAt) {
      return inc.incomeSource;
    }

    if (inc.bankAccountArchivedAt) {
      throw new Error("Cannot restore income schedule because its receiving bank account is archived. Please restore the bank account first.");
    }

    const activePrivate = await tx
      .select({ id: envelopes.id })
      .from(envelopes)
      .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
      .where(
        and(
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId),
          sql`${envelopes.archivedAt} IS NULL`,
          sql`(${envelopes.isPrivate} = true OR ${bankAccounts.isPrivate} = true)`
        )
      );

    const hasPrivate = activePrivate.length > 0;

    const [restored] = await tx
      .update(incomeSources)
      .set({
        archivedAt: null,
        archivedBy: null,
        ...(!hasPrivate ? { contributionMode: "FULL", contributionValue: null } : {}),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(incomeSources.id, itemId),
          eq(incomeSources.tenantId, tenantId),
          eq(incomeSources.appId, appId),
          sql`${incomeSources.archivedAt} IS NOT NULL`
        )
      )
      .returning();

    if (restored) {
      const startDate = restored.startDate || todayStr;
      if (restored.rrule) {
        const afterDateStr = startDate < todayStr ? yesterdayStr : null;
        await burstIncomeEvents(tx, {
          incomeSourceId: restored.id,
          name: restored.name,
          amount: restored.amount,
          rrule: restored.rrule,
          startDate,
          endDate: restored.endDate,
          contributionMode: restored.contributionMode,
          contributionValue: restored.contributionValue,
          tenantId,
          appId,
          userId,
          timeZone: tenantTz,
          afterDateStr,
        });
      } else {
        await tx.insert(incomeEvents).values({
          incomeSourceId: restored.id,
          name: restored.name,
          expectedDate: startDate,
          actualDate: startDate,
          expectedAmount: restored.amount,
          actualAmount: restored.amount,
          contributionMode: restored.contributionMode || "FULL",
          contributionValue: restored.contributionValue || null,
          status: "PENDING",
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    }

    return restored;
  }

  throw new Error("Unsupported item type for restoration.");
  });
}
