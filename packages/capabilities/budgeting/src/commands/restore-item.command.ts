import { envelopes, incomeSources, incomeEvents, expenseEvents, bankAccounts, tenants, apps, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { getTenantDateString } from "@money-matters/core";
import { burstEnvelopeEvents } from "./envelope-schedule.js";
import { burstIncomeEvents } from "./income-schedule.js";
import { DEFAULT_APP_FEATURE_FLAGS } from "@money-matters/types";

export async function restoreItemCommand(
  itemId: string,
  itemType: "ENVELOPE" | "INCOME_SOURCE" | "BANK_ACCOUNT",
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  const [tenantRecord] = await dbClient
    .select({ timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
  const getLocalDateString = (d: Date = new Date()) => getTenantDateString(d, { timezone: tenantTz });
  const todayStr = getLocalDateString();
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayStr = getLocalDateString(yesterday);

  if (itemType === "BANK_ACCOUNT") {
    const [acc] = await dbClient
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, itemId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));
    if (!acc) throw new Error("Bank account not found.");
    if (acc.isPrivate && acc.userId !== userId) {
      throw new Error("Access unauthorized or private account.");
    }
    if (acc.isPrivate) {
      const [appRecord] = await dbClient
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

    const [restoredAcc] = await dbClient
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
          eq(bankAccounts.appId, appId)
        )
      )
      .returning();

    // Cascade restore linked envelopes and income sources archived at timestamp T (within 2 seconds)
    if (bankArchivedAt) {
      const bankEpoch = Math.floor(new Date(bankArchivedAt).getTime() / 1000);

      // Restore cascade envelopes
      const restoredEnvelopes = await dbClient
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
            sql`ABS(EXTRACT(EPOCH FROM ${envelopes.archivedAt}) - ${bankEpoch}) <= 2`
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
          const afterDateStr = env.startDate < todayStr ? yesterdayStr : null;
          await burstEnvelopeEvents(dbClient, {
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
            afterDateStr,
          });
        }
      }

      // Restore cascade income sources
      const restoredIncomes = await dbClient
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
            sql`ABS(EXTRACT(EPOCH FROM ${incomeSources.archivedAt}) - ${bankEpoch}) <= 2`
          )
        )
        .returning();

      for (const inc of restoredIncomes) {
        const startDate = inc.startDate || todayStr;
        if (inc.rrule) {
          const afterDateStr = startDate < todayStr ? yesterdayStr : null;
          await burstIncomeEvents(dbClient, {
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
          await dbClient.insert(incomeEvents).values({
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
    }

    return restoredAcc;
  }

  if (itemType === "ENVELOPE") {
    const [env] = await dbClient
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
      const [appRecord] = await dbClient
        .select({ featureFlags: apps.featureFlags })
        .from(apps)
        .where(eq(apps.id, appId))
        .limit(1);
      const flags = appRecord?.featureFlags || DEFAULT_APP_FEATURE_FLAGS;
      if (!flags.privateMode) {
        throw new Error("Private Mode is currently disabled for this application. Private items cannot be restored.");
      }
    }

    if (env.bankAccountArchivedAt) {
      throw new Error("Cannot restore envelope because its linked bank account is archived. Please restore the bank account first.");
    }

    const [restored] = await dbClient
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
          eq(envelopes.appId, appId)
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
        const afterDateStr = restored.startDate < todayStr ? yesterdayStr : null;
        await burstEnvelopeEvents(dbClient, {
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
          afterDateStr,
        });
      }
    }

    return restored;
  }

  if (itemType === "INCOME_SOURCE") {
    const [inc] = await dbClient
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

    if (inc.bankAccountArchivedAt) {
      throw new Error("Cannot restore income schedule because its receiving bank account is archived. Please restore the bank account first.");
    }

    const activePrivate = await dbClient
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

    const [restored] = await dbClient
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
          eq(incomeSources.appId, appId)
        )
      )
      .returning();

    if (restored) {
      const startDate = restored.startDate || todayStr;
      if (restored.rrule) {
        const afterDateStr = startDate < todayStr ? yesterdayStr : null;
        await burstIncomeEvents(dbClient, {
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
        await dbClient.insert(incomeEvents).values({
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
}
