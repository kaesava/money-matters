import { transactionLedger, envelopes, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and, sql, desc, or, isNull, type SQL } from "drizzle-orm";

/**
 * Escapes SQL LIKE/ILIKE wildcard characters (%, _, \) to prevent wildcard injection.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function buildSearchTextPredicates(rawQuery: string): SQL[] {
  const escaped = escapeLikePattern(rawQuery.trim());
  const pattern = `%${escaped}%`;
  const predicates: SQL[] = [
    sql`${transactionLedger.note} ILIKE ${pattern} ESCAPE '\\'`,
    sql`${envelopes.name} ILIKE ${pattern} ESCAPE '\\'`,
    sql`${bankAccounts.name} ILIKE ${pattern} ESCAPE '\\'`,
  ];

  const numericPart = rawQuery.replace(/[^0-9.]/g, "");
  if (numericPart.length > 0 && /\d/.test(numericPart)) {
    const amountPattern = `%${escapeLikePattern(numericPart)}%`;
    predicates.push(sql`CAST(${transactionLedger.amount} AS TEXT) ILIKE ${amountPattern} ESCAPE '\\'`);
  }

  return predicates;
}

export async function searchTransactionsQuery(
  tenantId: string,
  appId: string,
  query: string,
  limit = 10,
  dbClient: DbOrTx,
  envelopeId?: string,
  bankAccountId?: string,
  userId?: string
) {
  const predicates = buildSearchTextPredicates(query);
  const conditions: SQL[] = [
    eq(transactionLedger.tenantId, tenantId),
    eq(transactionLedger.appId, appId),
    sql`${transactionLedger.archivedAt} IS NULL`,
    or(...predicates)!,
  ];

  if (envelopeId) conditions.push(eq(transactionLedger.envelopeId, envelopeId));
  if (bankAccountId) conditions.push(eq(transactionLedger.bankAccountId, bankAccountId));

  if (userId) {
    conditions.push(
      or(eq(bankAccounts.isPrivate, false), isNull(bankAccounts.isPrivate), eq(bankAccounts.userId, userId))!,
      or(eq(envelopes.isPrivate, false), isNull(envelopes.isPrivate), eq(envelopes.userId, userId))!
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
    .limit(limit);
}
