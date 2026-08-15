import { transactionLedger, DbOrTx } from "@money-matters/db";
import { eq, and, inArray } from "drizzle-orm";

export async function checkCsvDuplicatesQuery(
  idempotencyKeys: string[],
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
): Promise<Set<string>> {
  if (!idempotencyKeys || idempotencyKeys.length === 0) {
    return new Set<string>();
  }

  const existingRows = await dbClient
    .select({ idempotencyKey: transactionLedger.idempotencyKey })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        inArray(transactionLedger.idempotencyKey, idempotencyKeys)
      )
    );

  return new Set(existingRows.map((r) => r.idempotencyKey));
}
