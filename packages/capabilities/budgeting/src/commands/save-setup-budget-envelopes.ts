import { DbOrTx, envelopes, transactionLedger, getEnvelopeBalancesMap } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { EnvelopeType } from "@money-matters/types";
import { deriveRrule, computeBillScheduleAnchorDate } from "./save-setup-budget-calculators.js";
import { archivePendingExpenseEvents, synchronizeUpdatedEnvelopeEvents } from "./save-setup-budget-sync.js";

export interface SaveSetupEnvelopeInput {
  id?: string;
  name: string;
  envelopeType: EnvelopeType;
  fundingMode?: "TARGET_BALANCE" | "RECURRING" | null;
  bankAccountId?: string | null;
  targetAmount?: string | null;
  monthlyAmount?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  startDate?: string | null;
  endDate?: string | null;
  rrule?: string | null;
  safetyBufferFloor?: string | null;
  isSurplusTarget?: boolean;
  isPriority?: boolean;
  isPrivate?: boolean;
  orderIndex?: number;
  generateEvents?: boolean;
}

export async function processSetupEnvelopes(
  tx: DbOrTx,
  envelopesInput: SaveSetupEnvelopeInput[],
  archivedEnvelopeIds: string[],
  accountIdMap: Map<string, string>,
  primaryBankAccountId: string,
  tenantId: string,
  appId: string,
  userId: string,
  now: Date,
  timeZone: string = "Australia/Sydney"
): Promise<{ envelopeIdMap: Map<string, string>; sweptEnvelopesCount: number; sweptTotalAmount: number }> {
  const existingEnvelopes = await tx
    .select()
    .from(envelopes)
    .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), sql`${envelopes.archivedAt} IS NULL`));

  for (const envId of archivedEnvelopeIds) {
    const targetEnv = existingEnvelopes.find((e) => e.id === envId);
    if (targetEnv && targetEnv.envelopeType === "EVERYDAY" && !targetEnv.isPrivate) {
      throw new Error("The default Everyday envelope cannot be deleted or archived.");
    }
  }

  // Determine which envelope will serve as the single public Surplus Sweep Target
  let designatedSurplusIndex = envelopesInput.findIndex(
    (e) => e.isSurplusTarget === true && !e.isPrivate
  );
  if (designatedSurplusIndex === -1) {
    const existingSurplusIds = new Set(
      existingEnvelopes
        .filter((e) => e.isSurplusTarget && !e.isPrivate && !archivedEnvelopeIds.includes(e.id))
        .map((e) => e.id)
    );
    if (existingSurplusIds.size > 0) {
      designatedSurplusIndex = envelopesInput.findIndex(
        (e) => !e.isPrivate && Boolean(e.id && existingSurplusIds.has(e.id))
      );
    }
  }
  if (designatedSurplusIndex === -1) {
    // Priority: Emergency Reserve -> first non-private Goal -> non-private Everyday
    designatedSurplusIndex = envelopesInput.findIndex(
      (e) => !e.isPrivate && (e.name.toLowerCase().includes("emergency") || e.name.toLowerCase().includes("reserve"))
    );
    if (designatedSurplusIndex === -1) {
      designatedSurplusIndex = envelopesInput.findIndex(
        (e) => !e.isPrivate && e.envelopeType === "GOAL"
      );
    }
    if (designatedSurplusIndex === -1) {
      designatedSurplusIndex = envelopesInput.findIndex(
        (e) => !e.isPrivate && e.envelopeType === "EVERYDAY"
      );
    }
    if (designatedSurplusIndex === -1 && envelopesInput.length > 0) {
      designatedSurplusIndex = envelopesInput.findIndex((e) => !e.isPrivate);
    }
  }

  // Normalize envelopesInput so exactly one isSurplusTarget is true, and none on private
  envelopesInput.forEach((env, idx) => {
    env.isSurplusTarget = idx === designatedSurplusIndex;
  });

  // Clear isSurplusTarget from any existing envelopes in DB that are not the designated surplus envelope
  await tx
    .update(envelopes)
    .set({ isSurplusTarget: false })
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        eq(envelopes.isSurplusTarget, true)
      )
    );

  const envelopeIdMap = new Map<string, string>();
  let resolvedSurplusTargetId: string | undefined;

  for (let i = 0; i < envelopesInput.length; i++) {
    const envInput = envelopesInput[i];
    const fundingMode =
      envInput.fundingMode ??
      (envInput.envelopeType === "GOAL" ? "TARGET_BALANCE" : "RECURRING");
    const isPriority = envInput.isPriority ?? false;

    const matchedExisting =
      (envInput.id
        ? existingEnvelopes.find((e) => e.id === envInput.id && !archivedEnvelopeIds.includes(e.id))
        : null) ||
      existingEnvelopes.find(
        (e) =>
          !archivedEnvelopeIds.includes(e.id) &&
          e.envelopeType === envInput.envelopeType &&
          e.name.trim().toLowerCase() === envInput.name.trim().toLowerCase()
      );

    const resolvedBankAccountId =
      (envInput.bankAccountId && accountIdMap.get(envInput.bankAccountId)) ||
      envInput.bankAccountId ||
      (matchedExisting ? matchedExisting.bankAccountId : primaryBankAccountId);

    const isScheduled = envInput.envelopeType === "BILL" && fundingMode === "RECURRING";
    const isOngoingGoal = envInput.envelopeType === "GOAL" && fundingMode === "RECURRING";
    const rrule = (isScheduled || isOngoingGoal)
      ? envInput.rrule || deriveRrule(envInput.budgetFrequency || "MONTHLY")
      : envInput.rrule || null;
    const startDate = isScheduled
      ? envInput.startDate || computeBillScheduleAnchorDate(envInput.budgetFrequency || "MONTHLY", now, timeZone)
      : envInput.startDate || null;

    if (matchedExisting) {
      const effectiveGenerateEvents = isScheduled
        ? (envInput.generateEvents !== undefined ? envInput.generateEvents : (matchedExisting.generateEvents ?? true))
        : false;
      const scheduleChanged =
        (envInput.envelopeType !== matchedExisting.envelopeType) ||
        (fundingMode !== matchedExisting.fundingMode) ||
        (envInput.budgetFrequency !== undefined && envInput.budgetFrequency !== matchedExisting.budgetFrequency) ||
        (envInput.startDate !== undefined && envInput.startDate !== matchedExisting.startDate) ||
        (envInput.endDate !== undefined && envInput.endDate !== matchedExisting.endDate) ||
        (envInput.rrule !== undefined && envInput.rrule !== matchedExisting.rrule) ||
        (effectiveGenerateEvents !== (matchedExisting.generateEvents ?? true));

      const amountVal = envInput.enteredAmount || envInput.monthlyAmount || matchedExisting.enteredAmount || matchedExisting.monthlyAmount || "0.00";
      const nameOrAmountChanged =
        (envInput.name !== undefined && envInput.name !== matchedExisting.name) ||
        (envInput.enteredAmount !== undefined && envInput.enteredAmount !== matchedExisting.enteredAmount) ||
        (envInput.monthlyAmount !== undefined && envInput.monthlyAmount !== matchedExisting.monthlyAmount);

      await tx
        .update(envelopes)
        .set({
          name: envInput.name,
          envelopeType: envInput.envelopeType,
          fundingMode,
          isPriority: envInput.isPriority ?? matchedExisting.isPriority,
          targetAmount: envInput.targetAmount,
          monthlyAmount: envInput.monthlyAmount || matchedExisting.monthlyAmount,
          enteredAmount: envInput.enteredAmount !== undefined ? envInput.enteredAmount : matchedExisting.enteredAmount,
          budgetFrequency: envInput.budgetFrequency || matchedExisting.budgetFrequency || "MONTHLY",
          startDate,
          endDate: envInput.endDate !== undefined ? envInput.endDate : matchedExisting.endDate,
          rrule,
          safetyBufferFloor: envInput.safetyBufferFloor || matchedExisting.safetyBufferFloor || "0.00",
          isSurplusTarget: envInput.isSurplusTarget ?? matchedExisting.isSurplusTarget,
          isPrivate: envInput.isPrivate ?? matchedExisting.isPrivate,
          generateEvents: effectiveGenerateEvents,
          bankAccountId: resolvedBankAccountId || matchedExisting.bankAccountId,
          orderIndex: envInput.orderIndex ?? matchedExisting.orderIndex,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(envelopes.id, matchedExisting.id));

      const effectiveFreq = (envInput.budgetFrequency || matchedExisting.budgetFrequency || "MONTHLY") as "MONTHLY" | "WEEKLY" | "FORTNIGHTLY" | "QUARTERLY" | "ANNUALLY";
      const isScheduledBill = isScheduled && effectiveGenerateEvents === true;
      await synchronizeUpdatedEnvelopeEvents(tx, matchedExisting.id, scheduleChanged, nameOrAmountChanged, {
        name: envInput.name,
        amount: amountVal,
        rrule: rrule || deriveRrule(effectiveFreq),
        startDate: startDate || computeBillScheduleAnchorDate(effectiveFreq, now, timeZone),
        endDate: envInput.endDate || null,
        isScheduledBill,
        timeZone,
        tenantId,
        appId,
        userId,
        now,
      });

      if (envInput.id) envelopeIdMap.set(envInput.id, matchedExisting.id);
      envelopeIdMap.set(`name-${envInput.name}`, matchedExisting.id);
      if (envInput.isSurplusTarget) resolvedSurplusTargetId = matchedExisting.id;
    } else {
      const newEnvId = randomUUID();
      await tx.insert(envelopes).values({
        id: newEnvId,
        tenantId,
        appId,
        bankAccountId: resolvedBankAccountId,
        name: envInput.name,
        envelopeType: envInput.envelopeType,
        fundingMode,
        isPriority,
        targetAmount: envInput.targetAmount || null,
        monthlyAmount: envInput.monthlyAmount || null,
        enteredAmount: envInput.enteredAmount || null,
        budgetFrequency: envInput.budgetFrequency || "MONTHLY",
        startDate,
        endDate: envInput.endDate || null,
        rrule,
        safetyBufferFloor: envInput.safetyBufferFloor || "0.00",
        isSurplusTarget: envInput.isSurplusTarget ?? false,
        isPrivate: envInput.isPrivate ?? false,
        generateEvents: isScheduled ? (envInput.generateEvents ?? true) : false,
        orderIndex: envInput.orderIndex ?? i,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
      });

      if (envInput.id) envelopeIdMap.set(envInput.id, newEnvId);
      envelopeIdMap.set(`name-${envInput.name}`, newEnvId);
      if (envInput.isSurplusTarget) resolvedSurplusTargetId = newEnvId;
    }
  }

  const envelopeBalancesMap = await getEnvelopeBalancesMap(tenantId, appId, tx);
  let sweptEnvelopesCount = 0;
  let sweptTotalAmount = 0;

  for (const envId of archivedEnvelopeIds) {
    const envToArchive = existingEnvelopes.find((e) => e.id === envId);
    if (!envToArchive) continue;

    const currentBalance = envelopeBalancesMap[envId] || 0;
    if (currentBalance > 0.005) {
      const destEnvId =
        resolvedSurplusTargetId ||
        existingEnvelopes.find((e) => e.isSurplusTarget && e.id !== envId && !archivedEnvelopeIds.includes(e.id))?.id ||
        existingEnvelopes.find((e) => e.envelopeType === "EVERYDAY" && !e.isPrivate && e.id !== envId && !archivedEnvelopeIds.includes(e.id))?.id;

      if (!destEnvId) {
        throw new Error(
          `Cannot remove envelope "${envToArchive.name}" with positive balance of $${currentBalance.toFixed(2)} without specifying a valid destination envelope for the funds sweep.`
        );
      }

      const sweepAmountStr = currentBalance.toFixed(2);
      const transferGroupId = randomUUID();
      const transferNote = `Balance sweep upon archiving envelope "${envToArchive.name}"`;

      await tx.insert(transactionLedger).values([
        {
          id: randomUUID(),
          tenantId,
          appId,
          envelopeId: envId,
          bankAccountId: envToArchive.bankAccountId,
          amount: sweepAmountStr,
          flowType: "DEBIT",
          transactionType: "TRANSFER_OUT",
          idempotencyKey: `sweep-out-${envId}-${randomUUID()}`,
          note: transferNote,
          source: "MANUAL",
          transferGroupId,
          recordedAt: now,
          createdAt: now,
          createdBy: userId,
          updatedAt: now,
          updatedBy: userId,
        },
        {
          id: randomUUID(),
          tenantId,
          appId,
          envelopeId: destEnvId,
          bankAccountId: envToArchive.bankAccountId,
          amount: sweepAmountStr,
          flowType: "CREDIT",
          transactionType: "TRANSFER_IN",
          idempotencyKey: `sweep-in-${destEnvId}-${randomUUID()}`,
          note: transferNote,
          source: "MANUAL",
          transferGroupId,
          recordedAt: now,
          createdAt: now,
          createdBy: userId,
          updatedAt: now,
          updatedBy: userId,
        },
      ]);
      sweptEnvelopesCount++;
      sweptTotalAmount += currentBalance;
    }

    await tx
      .update(envelopes)
      .set({ archivedAt: now, archivedBy: userId, lastBurstDate: null, updatedAt: now, updatedBy: userId })
      .where(eq(envelopes.id, envId));
  }

  await archivePendingExpenseEvents(tx, tenantId, archivedEnvelopeIds);

  return { envelopeIdMap, sweptEnvelopesCount, sweptTotalAmount };
}
