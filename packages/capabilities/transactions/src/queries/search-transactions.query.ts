import { transactionLedger, envelopes, DbOrTx } from "@money-matters/db";
import { eq, and, sql, desc, ilike, or } from "drizzle-orm";

export async function searchTransactionsQuery(
  tenantId: string,
  appId: string,
  query: string,
  limit = 10,
  dbClient: DbOrTx,
  envelopeId?: string,
  bankAccountId?: string
) {
  const searchTerm = `%${query.trim()}%`;
  const conditions = [
    eq(transactionLedger.tenantId, tenantId),
    eq(transactionLedger.appId, appId),
    sql`${transactionLedger.archivedAt} IS NULL`,
    or(
      ilike(transactionLedger.note, searchTerm),
      ilike(envelopes.name, searchTerm)
    ),
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
    .limit(limit);
}
