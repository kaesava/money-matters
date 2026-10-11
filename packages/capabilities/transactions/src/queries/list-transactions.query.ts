import { transactionLedger, envelopes, DbOrTx } from "@money-matters/db";
import { eq, and, sql, desc } from "drizzle-orm";

export async function listTransactionsQuery(
  tenantId: string,
  appId: string,
  limit = 50,
  offset = 0,
  dbClient: DbOrTx,
  envelopeId?: string,
  bankAccountId?: string
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
  dbClient: DbOrTx
) {
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
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        eq(transactionLedger.envelopeId, envelopeId),
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    )
    .orderBy(desc(transactionLedger.recordedAt))
    .limit(limit)
    .offset(offset);
}
