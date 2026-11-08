import { envelopes, incomeSources, incomeEvents, expenseEvents, bankAccounts, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";
import { getTenantDateString } from "@money-matters/core";

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

  if (itemType === "BANK_ACCOUNT") {
    const [acc] = await dbClient
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, itemId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));
    if (!acc) throw new Error("Bank account not found.");
    if (acc.isPrivate && acc.userId !== userId) {
      throw new Error("Access unauthorized or private account.");
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
          env.envelopeType === "SCHEDULED_BILL" &&
          env.generateEvents !== false &&
          env.rrule &&
          env.startDate &&
          parseFloat(amountVal) > 0
        ) {
          const dates = generateBurstDates(env.rrule, env.startDate, env.endDate, 12);
          if (dates.length > 0) {
            await dbClient.insert(expenseEvents).values(
              dates.map((d) => ({
                envelopeId: env.id,
                name: env.name,
                expectedDate: getLocalDateString(d),
                expectedAmount: amountVal,
                isScheduled: true,
                status: "PENDING" as const,
                tenantId,
                appId,
                createdBy: userId,
                updatedBy: userId,
              }))
            );
          }
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
        const startDate = inc.startDate || getLocalDateString();
        if (inc.rrule) {
          const dates = generateBurstDates(inc.rrule, startDate, inc.endDate, 12);
          if (dates.length > 0) {
            await dbClient.insert(incomeEvents).values(
              dates.map((d) => ({
                incomeSourceId: inc.id,
                expectedDate: getLocalDateString(d),
                expectedAmount: inc.amount,
                contributionMode: inc.contributionMode || "FULL",
                contributionValue: inc.contributionValue || null,
                status: "PENDING" as const,
                tenantId,
                appId,
                createdBy: userId,
                updatedBy: userId,
              }))
            );
          }
        } else {
          await dbClient.insert(incomeEvents).values({
            incomeSourceId: inc.id,
            expectedDate: startDate,
            expectedAmount: inc.amount,
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
    const rawEnv = (env as any).envelope ?? env;
    const isEnvPrivate = Boolean(rawEnv.isPrivate);
    const envUserId = rawEnv.userId;
    if (
      (isEnvPrivate && envUserId !== userId) ||
      (env.bankAccountIsPrivate && env.bankAccountUserId !== userId)
    ) {
      throw new Error("Access unauthorized or private envelope.");
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
        restored.envelopeType === "SCHEDULED_BILL" &&
        restored.generateEvents !== false &&
        restored.rrule &&
        restored.startDate &&
        parseFloat(amountVal) > 0
      ) {
        const dates = generateBurstDates(restored.rrule, restored.startDate, restored.endDate, 12);
        if (dates.length > 0) {
          await dbClient.insert(expenseEvents).values(
            dates.map((d) => ({
              envelopeId: restored.id,
              name: restored.name,
              expectedDate: getLocalDateString(d),
              expectedAmount: amountVal,
              isScheduled: true,
              status: "PENDING" as const,
              tenantId,
              appId,
              createdBy: userId,
              updatedBy: userId,
            }))
          );
        }
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
    const rawInc = (inc as any).incomeSource ?? inc;
    const isIncPrivate = Boolean(rawInc.isPrivate);
    const incUserId = rawInc.userId;
    if (
      (isIncPrivate && incUserId !== userId) ||
      (inc.bankAccountIsPrivate && inc.bankAccountUserId !== userId)
    ) {
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
      const startDate = restored.startDate || getLocalDateString();
      if (restored.rrule) {
        const dates = generateBurstDates(restored.rrule, startDate, restored.endDate, 12);
        if (dates.length > 0) {
          await dbClient.insert(incomeEvents).values(
            dates.map((d) => ({
              incomeSourceId: restored.id,
              expectedDate: getLocalDateString(d),
              expectedAmount: restored.amount,
              contributionMode: restored.contributionMode || "FULL",
              contributionValue: restored.contributionValue || null,
              status: "PENDING" as const,
              tenantId,
              appId,
              createdBy: userId,
              updatedBy: userId,
            }))
          );
        }
      } else {
        await dbClient.insert(incomeEvents).values({
          incomeSourceId: restored.id,
          expectedDate: startDate,
          expectedAmount: restored.amount,
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
