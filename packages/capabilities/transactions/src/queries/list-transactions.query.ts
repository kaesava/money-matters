import { transactionLedger, envelopes, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and, sql, desc, or, isNull } from "drizzle-orm";

export async function listTransactionsQuery(
  tenantId: string,
  appId: string,
  limit = 50,
  offset = 0,
  dbClient: DbOrTx,
  envelopeId?: string,
  bankAccountId?: string,
  userId?: string
) {
  const conditions = [
    eq(transactionLedger.tenantId, tenantId),
    eq(transactionLedger.appId, appId),
    sql`${transactionLedger.archivedAt} IS NULL`,
  ];

  if (envelopeId) {
    conditions.push(eq(transactionLedger.envelopeId, envelopeId));
  }

  if (bankAccountId) {
    conditions.push(eq(transactionLedger.bankAccountId, bankAccountId));
  }

  if (userId) {
    conditions.push(
      or(
        eq(bankAccounts.isPrivate, false),
        isNull(bankAccounts.isPrivate),
        eq(bankAccounts.userId, userId)
      )!
    );
    conditions.push(
      or(
        eq(envelopes.isPrivate, false),
        isNull(envelopes.isPrivate),
        eq(envelopes.userId, userId)
      )!
    );
  }

  return await dbClient
    .select({
      id: transactionLedger.id,
      envelopeId: transactionLedger.envelopeId,
      bankAccountId: transactionLedger.bankAccountId,
      planLineId: transactionLedger.planLineId,
      transferGroupId: transactionLedger.transferGroupId,
      flowType: transactionLedger.flowType,
      transactionType: transactionLedger.transactionType,
      amount: transactionLedger.amount,
      note: transactionLedger.note,
      source: transactionLedger.source,
      recordedAt: transactionLedger.recordedAt,
      envelopeName: envelopes.name,
    })
    .from(transactionLedger)
    .leftJoin(envelopes, eq(transactionLedger.envelopeId, envelopes.id))
    .leftJoin(bankAccounts, eq(transactionLedger.bankAccountId, bankAccounts.id))
    .where(and(...conditions))
    .orderBy(desc(transactionLedger.recordedAt))
    .limit(limit)
    .offset(offset);
}

export async function listEnvelopeTransactionsQuery(
  envelopeId: string,
  tenantId: string,
  appId: string,
  limit = 30,
  offset = 0,
  dbClient: DbOrTx,
  userId?: string
) {
  const conditions = [
    eq(transactionLedger.tenantId, tenantId),
    eq(transactionLedger.appId, appId),
    eq(transactionLedger.envelopeId, envelopeId),
    sql`${transactionLedger.archivedAt} IS NULL`,
  ];

  if (userId) {
    conditions.push(
      or(
        eq(bankAccounts.isPrivate, false),
        isNull(bankAccounts.isPrivate),
        eq(bankAccounts.userId, userId)
      )!
    );
    conditions.push(
      or(
        eq(envelopes.isPrivate, false),
        isNull(envelopes.isPrivate),
        eq(envelopes.userId, userId)
      )!
    );
  }

  return await dbClient
    .select({
      id: transactionLedger.id,
      envelopeId: transactionLedger.envelopeId,
      bankAccountId: transactionLedger.bankAccountId,
      planLineId: transactionLedger.planLineId,
      flowType: transactionLedger.flowType,
      amount: transactionLedger.amount,
      note: transactionLedger.note,
      source: transactionLedger.source,
      recordedAt: transactionLedger.recordedAt,
      envelopeName: envelopes.name,
    })
    .from(transactionLedger)
    .leftJoin(envelopes, eq(transactionLedger.envelopeId, envelopes.id))
    .leftJoin(bankAccounts, eq(transactionLedger.bankAccountId, bankAccounts.id))
    .where(and(...conditions))
    .orderBy(desc(transactionLedger.recordedAt))
    .limit(limit)
    .offset(offset);
}
