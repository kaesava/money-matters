import { transactionLedger, DbOrTx } from "@money-matters/db";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

export const RollbackCsvImportBatchInputSchema = z.object({
  batchId: z.string().uuid(),
}).strict();

export type RollbackCsvImportBatchInput = z.infer<typeof RollbackCsvImportBatchInputSchema>;

export async function rollbackCsvImportBatchCommand(
  input: RollbackCsvImportBatchInput,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
): Promise<{ rolledBackCount: number }> {
  const now = new Date();

  const updatedRows = await dbClient
    .update(transactionLedger)
    .set({
      archivedAt: now,
      updatedBy: userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        eq(transactionLedger.transferGroupId, input.batchId),
        isNull(transactionLedger.archivedAt)
      )
    )
    .returning({ id: transactionLedger.id });

  return {
    rolledBackCount: updatedRows.length,
  };
}
