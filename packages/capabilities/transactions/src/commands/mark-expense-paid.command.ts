import {
  bankAccounts,
  DbOrTx,
  envelopes,
  expenseEvents,
  getEnvelopeBalancesMap,
  transactionLedger,
} from "@money-matters/db";
import { MarkExpensePaidInput } from "@money-matters/types";
import { toCents } from "@money-matters/core";
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { recordExpenseCommand } from "./record-expense.command.js";

interface EventTargetRow {
  id: string;
  expectedAmount: string;
  expectedDate: string;
  name: string;
  note: string | null;
  envelopeId: string | null;
  envelopeName: string | null;
  envelopeIsPrivate: boolean | null;
  envelopeUserId: string | null;
  bankAccountIsPrivate: boolean | null;
  bankAccountUserId: string | null;
}

async function loadAccessiblePendingTarget(
  tx: DbOrTx,
  eventId: string,
  tenantId: string,
  appId: string,
  userId: string
): Promise<EventTargetRow> {
  const [evt] = await tx
    .select({
      id: expenseEvents.id,
      expectedAmount: expenseEvents.expectedAmount,
      expectedDate: expenseEvents.expectedDate,
      name: expenseEvents.name,
      note: expenseEvents.note,
      envelopeId: expenseEvents.envelopeId,
      envelopeName: envelopes.name,
      envelopeIsPrivate: envelopes.isPrivate,
      envelopeUserId: envelopes.userId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(expenseEvents)
    .leftJoin(envelopes, eq(expenseEvents.envelopeId, envelopes.id))
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(expenseEvents.id, eventId),
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  if (
    !evt ||
    (evt.envelopeIsPrivate && evt.envelopeUserId !== userId) ||
    (evt.bankAccountIsPrivate && evt.bankAccountUserId !== userId)
  ) {
    throw new Error("Expense event not found.");
  }
  return evt;
}

async function applyShortfallTransfers(
  tx: DbOrTx,
  transfers: NonNullable<MarkExpensePaidInput["shortfallTransfers"]>,
  destEnvelopeId: string,
  destEnvelopeName: string,
  paidDate: string,
  tenantId: string,
  appId: string,
  userId: string
): Promise<void> {
  if (transfers.length === 0) return;
  for (const t of transfers) {
    if (t.sourceEnvelopeId === destEnvelopeId) {
      throw new Error("Cannot transfer shortfall from the destination envelope itself.");
    }
  }

  const sourceIds = Array.from(new Set(transfers.map((t) => t.sourceEnvelopeId)));
  const sourceRows = await tx
    .select({
      id: envelopes.id,
      name: envelopes.name,
      bankAccountId: envelopes.bankAccountId,
      isPrivate: envelopes.isPrivate,
      userId: envelopes.userId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        inArray(envelopes.id, sourceIds),
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`
      )
    );

  const sourceMap = new Map(sourceRows.map((r) => [r.id, r]));
  const balancesMap = await getEnvelopeBalancesMap(tenantId, appId, tx);
  const requestedBySourceCents = new Map<string, number>();

  for (const t of transfers) {
    const src = sourceMap.get(t.sourceEnvelopeId);
    if (
      !src ||
      (src.isPrivate && src.userId !== userId) ||
      (src.bankAccountIsPrivate && src.bankAccountUserId !== userId)
    ) {
      throw new Error("Source envelope invalid or access unauthorized.");
    }
    const nextCents = (requestedBySourceCents.get(t.sourceEnvelopeId) ?? 0) + toCents(t.amount);
    requestedBySourceCents.set(t.sourceEnvelopeId, nextCents);
    const availableCents = Math.round((balancesMap[t.sourceEnvelopeId] ?? 0) * 100);
    if (nextCents > availableCents) {
      throw new Error(
        `Insufficient funds in ${src.name}. Available: ${(availableCents / 100).toFixed(2)}, requested: ${(nextCents / 100).toFixed(2)}.`
      );
    }
  }

  const recordedAt = new Date(paidDate);
  const ledgerRows = transfers.flatMap((t) => {
    const src = sourceMap.get(t.sourceEnvelopeId)!;
    const transferGroupId = randomUUID();
    return [
      {
        envelopeId: src.id,
        bankAccountId: src.bankAccountId,
        flowType: "DEBIT" as const,
        transactionType: "TRANSFER_OUT" as const,
        amount: t.amount,
        idempotencyKey: `shortfall-out-${transferGroupId}`,
        transferGroupId,
        note: `Transfer to ${destEnvelopeName}`,
        source: "MANUAL" as const,
        recordedAt,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        envelopeId: destEnvelopeId,
        bankAccountId: null,
        flowType: "CREDIT" as const,
        transactionType: "TRANSFER_IN" as const,
        amount: t.amount,
        idempotencyKey: `shortfall-in-${transferGroupId}`,
        transferGroupId,
        note: `Transfer from ${src.name}`,
        source: "MANUAL" as const,
        recordedAt,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
    ];
  });

  await tx.insert(transactionLedger).values(ledgerRows);
}

/**
 * Atomically marks a PENDING expense event as CONFIRMED, executes any shortfall transfers,
 * and records the resulting expense debit inside a single DB transaction.
 */
export async function markExpensePaidCommand(
  input: MarkExpensePaidInput,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
): Promise<{ success: boolean; message: string }> {
  return dbClient.transaction(async (tx) => {
    const evt = await loadAccessiblePendingTarget(tx, input.eventId, tenantId, appId, userId);
    const paidAmount = input.amount || evt.expectedAmount;
    const paidDate = input.date || evt.expectedDate;

    const locked = await tx
      .update(expenseEvents)
      .set({
        status: "CONFIRMED",
        actualAmount: paidAmount,
        actualDate: paidDate,
        note: input.note || evt.note,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(expenseEvents.id, input.eventId),
          eq(expenseEvents.tenantId, tenantId),
          eq(expenseEvents.appId, appId),
          eq(expenseEvents.status, "PENDING"),
          sql`${expenseEvents.archivedAt} IS NULL`
        )
      )
      .returning({ id: expenseEvents.id });

    if (locked.length === 0) {
      throw new Error("Expense event has already been paid or updated.");
    }

    if (evt.envelopeId) {
      await applyShortfallTransfers(
        tx,
        input.shortfallTransfers ?? [],
        evt.envelopeId,
        evt.envelopeName || "Envelope",
        paidDate,
        tenantId,
        appId,
        userId
      );

      await recordExpenseCommand(
        {
          envelopeId: evt.envelopeId,
          flowType: "DEBIT",
          amount: paidAmount,
          source: "MANUAL",
          note: input.note?.trim() || evt.name,
          date: paidDate,
        },
        tenantId,
        appId,
        userId,
        tx
      );
    }

    return { success: true, message: "Bill marked as paid." };
  });
}
