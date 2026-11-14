import { transferEvents, envelopes, bankAccounts, tenants, type DbOrTx } from "@money-matters/db";
import { getTenantDateString } from "@money-matters/core";
import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { isTransferVisibleToUser } from "../queries/list-transfer-events.query.js";

async function loadVisibleEnvelope(
  envelopeId: string,
  tenantId: string,
  appId: string,
  userId: string,
  label: string,
  db: DbOrTx
) {
  const [env] = await db
    .select({
      id: envelopes.id,
      name: envelopes.name,
      isPrivate: envelopes.isPrivate,
      userId: envelopes.userId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(envelopes.id, envelopeId),
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`
      )
    )
    .limit(1);

  if (!env || (env.isPrivate && env.userId !== userId) || (env.bankAccountIsPrivate && env.bankAccountUserId !== userId)) {
    throw new Error(`${label} envelope not found.`);
  }
  return env;
}

export interface CreateTransferSourceInput {
  name?: string;
  amount: string;
  sourceEnvelopeId?: string;
  sourcePoolId?: string;
  destinationEnvelopeId?: string;
  destinationPoolId?: string;
  startDate?: string;
}

/**
 * Creates a scheduled pending transfer event between two visible envelopes.
 */
export async function createTransferSourceCommand(
  input: CreateTransferSourceInput,
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  const sourceId = (input.sourceEnvelopeId || input.sourcePoolId)!;
  const destId = (input.destinationEnvelopeId || input.destinationPoolId)!;
  if (!sourceId || !destId || sourceId === destId) {
    throw new Error("Source and destination envelopes must be specified and different.");
  }

  const [sourceEnv, destEnv] = await Promise.all([
    loadVisibleEnvelope(sourceId, tenantId, appId, userId, "Source", db),
    loadVisibleEnvelope(destId, tenantId, appId, userId, "Destination", db),
  ]);

  const [tenantRecord] = await db
    .select({ timezone: tenants.timezone })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
  const transferName = input.name || `Transfer: ${sourceEnv.name} ➔ ${destEnv.name}`;
  const eventDate = input.startDate || getTenantDateString(new Date(), { timezone: tenantTz });

  const [insertedEvent] = await db
    .insert(transferEvents)
    .values({
      sourceEnvelopeId: sourceId,
      destinationEnvelopeId: destId,
      name: transferName,
      expectedDate: eventDate,
      expectedAmount: input.amount,
      status: "PENDING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  return {
    id: insertedEvent.id,
    firstEventId: insertedEvent.id,
    name: transferName,
    amount: input.amount,
    sourceEnvelopeId: sourceId,
    destinationEnvelopeId: destId,
    startDate: input.startDate || null,
  };
}

/**
 * Soft-archives a transfer event after verifying stealth privacy ownership.
 */
export async function deleteTransferEventCommand(
  eventId: string,
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  const sourceEnvelopes = alias(envelopes, "sourceEnvelopes");
  const destEnvelopes = alias(envelopes, "destEnvelopes");
  const sourceBankAccounts = alias(bankAccounts, "sourceBankAccounts");
  const destBankAccounts = alias(bankAccounts, "destBankAccounts");

  const [evt] = await db
    .select({
      id: transferEvents.id,
      sourceIsPrivate: sourceEnvelopes.isPrivate,
      sourceUserId: sourceEnvelopes.userId,
      sourceBankIsPrivate: sourceBankAccounts.isPrivate,
      sourceBankUserId: sourceBankAccounts.userId,
      destIsPrivate: destEnvelopes.isPrivate,
      destUserId: destEnvelopes.userId,
      destBankIsPrivate: destBankAccounts.isPrivate,
      destBankUserId: destBankAccounts.userId,
    })
    .from(transferEvents)
    .leftJoin(sourceEnvelopes, eq(transferEvents.sourceEnvelopeId, sourceEnvelopes.id))
    .leftJoin(sourceBankAccounts, eq(sourceEnvelopes.bankAccountId, sourceBankAccounts.id))
    .leftJoin(destEnvelopes, eq(transferEvents.destinationEnvelopeId, destEnvelopes.id))
    .leftJoin(destBankAccounts, eq(destEnvelopes.bankAccountId, destBankAccounts.id))
    .where(and(eq(transferEvents.id, eventId), eq(transferEvents.tenantId, tenantId), eq(transferEvents.appId, appId)));

  if (!evt || !isTransferVisibleToUser(evt, userId)) {
    throw new Error("Transfer event not found.");
  }

  await db
    .update(transferEvents)
    .set({ archivedAt: new Date(), updatedAt: new Date(), updatedBy: userId })
    .where(and(eq(transferEvents.id, eventId), eq(transferEvents.tenantId, tenantId), eq(transferEvents.appId, appId)));

  return { success: true };
}

/**
 * Updates mutable fields on an upcoming transfer event.
 */
export async function updateTransferEventCommand(
  input: { eventId: string; name?: string; amount?: string; expectedDate?: string },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  await db
    .update(transferEvents)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.amount !== undefined ? { expectedAmount: input.amount } : {}),
      ...(input.expectedDate !== undefined ? { expectedDate: input.expectedDate } : {}),
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(and(eq(transferEvents.id, input.eventId), eq(transferEvents.tenantId, tenantId), eq(transferEvents.appId, appId)));

  return { success: true };
}

export type MoveMoneyFn = (
  cmd: { sourceEnvelopeId: string; destinationEnvelopeId: string; amount: string; note?: string },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) => Promise<unknown>;

/**
 * Executes a pending transfer event using an injected moveMoney command and marks it CONFIRMED.
 */
export async function executeTransferEventCommand(
  input: {
    eventId: string;
    name?: string;
    amount?: string;
    sourceEnvelopeId?: string;
    sourcePoolId?: string;
    destinationEnvelopeId?: string;
    destinationPoolId?: string;
  },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx,
  moveMoney: MoveMoneyFn
) {
  const [evt] = await db
    .select()
    .from(transferEvents)
    .where(and(eq(transferEvents.id, input.eventId), eq(transferEvents.tenantId, tenantId), eq(transferEvents.appId, appId)));

  if (!evt) throw new Error("Transfer event not found.");

  const transferName = input.name || evt.name;
  const sourceEnvelopeId = input.sourceEnvelopeId || input.sourcePoolId || evt.sourceEnvelopeId;
  const destinationEnvelopeId = input.destinationEnvelopeId || input.destinationPoolId || evt.destinationEnvelopeId;
  const amountToTransfer = input.amount || evt.expectedAmount;

  await moveMoney({ sourceEnvelopeId, destinationEnvelopeId, amount: amountToTransfer, note: transferName }, tenantId, appId, userId, db);

  await db
    .update(transferEvents)
    .set({
      status: "CONFIRMED",
      name: transferName,
      actualAmount: amountToTransfer,
      sourceEnvelopeId,
      destinationEnvelopeId,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(transferEvents.id, input.eventId));

  return { success: true, message: "Transfer completed successfully." };
}
