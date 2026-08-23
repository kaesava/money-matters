import { transactionLedger, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { z } from "zod";

export const CsvImportBatchItemSchema = z.object({
  batchId: z.string(),
  importedAt: z.string(),
  bankAccountId: z.string().nullable(),
  bankAccountName: z.string(),
  rowCount: z.number(),
  totalAmount: z.string(),
}).strict();

export type CsvImportBatchItem = z.infer<typeof CsvImportBatchItemSchema>;

export async function listCsvImportBatchesQuery(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
): Promise<CsvImportBatchItem[]> {
  const rows = await dbClient
    .select({
      batchId: transactionLedger.transferGroupId,
      bankAccountId: transactionLedger.bankAccountId,
      bankAccountName: bankAccounts.name,
      amount: transactionLedger.amount,
      recordedAt: transactionLedger.recordedAt,
    })
    .from(transactionLedger)
    .leftJoin(bankAccounts, eq(transactionLedger.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        eq(transactionLedger.source, "IMPORT"),
        isNotNull(transactionLedger.transferGroupId),
        isNull(transactionLedger.archivedAt)
      )
    )
    .orderBy(desc(transactionLedger.recordedAt));

  const batchMap = new Map<
    string,
    {
      batchId: string;
      importedAt: Date;
      bankAccountId: string | null;
      bankAccountName: string;
      rowCount: number;
      totalNum: number;
    }
  >();

  for (const row of rows) {
    if (!row.batchId) continue;
    const existing = batchMap.get(row.batchId) || {
      batchId: row.batchId,
      importedAt: row.recordedAt ? new Date(row.recordedAt) : new Date(),
      bankAccountId: row.bankAccountId,
      bankAccountName: row.bankAccountName || "Bank Account",
      rowCount: 0,
      totalNum: 0,
    };
    existing.rowCount += 1;
    existing.totalNum += parseFloat(row.amount || "0");
    batchMap.set(row.batchId, existing);
  }

  return Array.from(batchMap.values()).map((b) => ({
    batchId: b.batchId,
    importedAt: b.importedAt.toISOString(),
    bankAccountId: b.bankAccountId,
    bankAccountName: b.bankAccountName,
    rowCount: b.rowCount,
    totalAmount: b.totalNum.toFixed(2),
  }));
}
