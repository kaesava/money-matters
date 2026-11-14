import { transferEvents, envelopes, bankAccounts, type DbOrTx } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface TransferPrivacyRow {
  sourceIsPrivate: boolean | null;
  sourceUserId: string | null;
  sourceBankIsPrivate: boolean | null;
  sourceBankUserId: string | null;
  destIsPrivate: boolean | null;
  destUserId: string | null;
  destBankIsPrivate: boolean | null;
  destBankUserId: string | null;
}

/**
 * Returns true if the caller is permitted to view/mutate a transfer between source and destination envelopes.
 */
export function isTransferVisibleToUser(row: TransferPrivacyRow, userId: string): boolean {
  if (row.sourceIsPrivate && row.sourceUserId !== userId) return false;
  if (row.sourceBankIsPrivate && row.sourceBankUserId !== userId) return false;
  if (row.destIsPrivate && row.destUserId !== userId) return false;
  if (row.destBankIsPrivate && row.destBankUserId !== userId) return false;
  return true;
}

/**
 * Lists all active transfer events for a tenant, filtered by stealth privacy rules.
 */
export async function listTransferEventsQuery(
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  const sourceEnvelopes = alias(envelopes, "sourceEnvelopes");
  const destEnvelopes = alias(envelopes, "destEnvelopes");
  const sourceBankAccounts = alias(bankAccounts, "sourceBankAccounts");
  const destBankAccounts = alias(bankAccounts, "destBankAccounts");

  const rows = await db
    .select({
      id: transferEvents.id,
      name: transferEvents.name,
      expectedAmount: transferEvents.expectedAmount,
      expectedDate: transferEvents.expectedDate,
      status: transferEvents.status,
      sourceEnvelopeId: transferEvents.sourceEnvelopeId,
      sourcePoolId: transferEvents.sourceEnvelopeId,
      sourceEnvelopeName: sourceEnvelopes.name,
      sourcePoolName: sourceEnvelopes.name,
      sourceIsPrivate: sourceEnvelopes.isPrivate,
      sourceUserId: sourceEnvelopes.userId,
      sourceBankIsPrivate: sourceBankAccounts.isPrivate,
      sourceBankUserId: sourceBankAccounts.userId,
      destinationEnvelopeId: transferEvents.destinationEnvelopeId,
      destinationPoolId: transferEvents.destinationEnvelopeId,
      destinationEnvelopeName: destEnvelopes.name,
      destinationPoolName: destEnvelopes.name,
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
    .where(
      and(
        eq(transferEvents.tenantId, tenantId),
        eq(transferEvents.appId, appId),
        sql`${transferEvents.archivedAt} IS NULL`
      )
    );

  return rows.filter((r) => isTransferVisibleToUser(r, userId));
}
