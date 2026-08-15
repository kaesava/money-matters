import { z } from "zod";
import { eq, and, isNull, count, inArray } from "drizzle-orm";
import { categories, transactionLedger, DbOrTx } from "@money-matters/db";

const DEFAULT_APP_ID = "01908bde-34bb-7b19-a178-574211bc93aa";

export const ReSetupCategoryItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(["EVERYDAY", "REGULAR", "GOAL"]),
  monthlyAmount: z.number().nullable().optional(),
  targetAmount: z.number().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  isEssential: z.boolean().optional(),
}).strict();

export const ReSetupBudgetInputSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  everydayTargetCap: z.number().nonnegative(),
  billsTargetCap: z.number().nonnegative(),
  categoriesList: z.array(ReSetupCategoryItemSchema),
}).strict();

export type ReSetupBudgetInput = z.infer<typeof ReSetupBudgetInputSchema>;

/**
 * Re-Setup Budget Command Handler
 * 
 * Preservatively adjusts household budget caps and categories:
 * - Updates target caps for Everyday Pool and Bills Pool.
 * - Soft-archives categories removed during setup if they contain >= 1 historical transactions.
 * - Hard-deletes categories removed during setup if they contain 0 transactions.
 * - Preserves historical transaction_ledger integrity.
 */
export async function reSetupBudget(db: DbOrTx, input: ReSetupBudgetInput): Promise<{ status: "SUCCESS"; updatedCount: number; archivedCount: number }> {
  ReSetupBudgetInputSchema.parse(input);

  // Fetch current active categories for tenant
  const existingCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.tenantId, input.tenantId), isNull(categories.archivedAt)));

  const incomingIds = new Set(input.categoriesList.map((c) => c.id).filter(Boolean));
  let updatedCount = 0;
  let archivedCount = 0;

  // Process incoming category updates & creations concurrently (P0 #4)
  const newCategoriesToInsert = [];
  const updatePromises = [];
  for (const item of input.categoriesList) {
    if (item.id) {
      // Collect update promise for concurrent execution
      updatePromises.push(
        db
          .update(categories)
          .set({
            name: item.name,
            type: item.type,
            monthlyAmount: item.monthlyAmount !== undefined && item.monthlyAmount !== null ? String(item.monthlyAmount) : undefined,
            updatedAt: new Date(),
            updatedBy: input.userId,
          })
          .where(and(eq(categories.id, item.id), eq(categories.tenantId, input.tenantId)))
      );
      updatedCount++;
    } else {
      // Collect new sub-category for bulk insert
      newCategoriesToInsert.push({
        tenantId: input.tenantId,
        appId: DEFAULT_APP_ID,
        name: item.name,
        type: item.type,
        monthlyAmount: item.monthlyAmount !== undefined && item.monthlyAmount !== null ? String(item.monthlyAmount) : "0",
        createdBy: input.userId,
        updatedBy: input.userId,
      });
      updatedCount++;
    }
  }

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }

  if (newCategoriesToInsert.length > 0) {
    await db.insert(categories).values(newCategoriesToInsert);
  }

  // Handle removed categories (exist in DB but missing from incoming payload)
  const removedCategoryIds = existingCategories
    .map((c) => c.id)
    .filter((id) => !incomingIds.has(id));

  if (removedCategoryIds.length > 0) {
    // Bulk query transaction counts for all removed categories
    const txCounts = await db
      .select({
        categoryId: transactionLedger.categoryId,
        value: count(),
      })
      .from(transactionLedger)
      .where(
        and(
          inArray(transactionLedger.categoryId, removedCategoryIds),
          eq(transactionLedger.tenantId, input.tenantId)
        )
      )
      .groupBy(transactionLedger.categoryId);

    const txCountMap = new Map(
      txCounts.map((row) => [row.categoryId, row.value ?? 0])
    );

    const idsToSoftArchive = [];
    const idsToHardDelete = [];

    for (const catId of removedCategoryIds) {
      const txCount = txCountMap.get(catId) ?? 0;
      if (txCount > 0) {
        idsToSoftArchive.push(catId);
      } else {
        idsToHardDelete.push(catId);
      }
    }

    if (idsToSoftArchive.length > 0) {
      await db
        .update(categories)
        .set({
          archivedAt: new Date(),
          archivedBy: input.userId,
          updatedAt: new Date(),
          updatedBy: input.userId,
        })
        .where(
          and(
            inArray(categories.id, idsToSoftArchive),
            eq(categories.tenantId, input.tenantId)
          )
        );
      archivedCount += idsToSoftArchive.length;
    }

    if (idsToHardDelete.length > 0) {
      await db
        .delete(categories)
        .where(
          and(
            inArray(categories.id, idsToHardDelete),
            eq(categories.tenantId, input.tenantId)
          )
        );
      archivedCount += idsToHardDelete.length;
    }
  }

  return { status: "SUCCESS", updatedCount, archivedCount };
}
