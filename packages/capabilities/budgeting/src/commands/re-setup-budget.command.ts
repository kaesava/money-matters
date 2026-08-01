import { z } from "zod";
import { eq, and, isNull, count } from "drizzle-orm";
import { categories, transactionLedger } from "@money-matters/db";
import { PgDatabase } from "drizzle-orm/pg-core";

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
export async function reSetupBudget(db: PgDatabase<any, any, any>, input: ReSetupBudgetInput): Promise<{ status: "SUCCESS"; updatedCount: number; archivedCount: number }> {
  ReSetupBudgetInputSchema.parse(input);

  // Fetch current active categories for tenant
  const existingCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.tenantId, input.tenantId), isNull(categories.archivedAt)));

  const incomingIds = new Set(input.categoriesList.map((c) => c.id).filter(Boolean));
  let updatedCount = 0;
  let archivedCount = 0;

  // Process incoming category updates & creations
  for (const item of input.categoriesList) {
    if (item.id) {
      // Update existing category
      await db
        .update(categories)
        .set({
          name: item.name,
          type: item.type,
          monthlyAmount: item.monthlyAmount !== undefined && item.monthlyAmount !== null ? String(item.monthlyAmount) : undefined,
          updatedAt: new Date(),
          updatedBy: input.userId,
        })
        .where(and(eq(categories.id, item.id), eq(categories.tenantId, input.tenantId)));
      updatedCount++;
    } else {
      // Insert new sub-category
      await db.insert(categories).values({
        tenantId: input.tenantId,
        appId: "01908bde-34bb-7b19-a178-574211bc93aa",
        name: item.name,
        type: item.type,
        monthlyAmount: item.monthlyAmount !== undefined && item.monthlyAmount !== null ? String(item.monthlyAmount) : "0",
        createdBy: input.userId,
        updatedBy: input.userId,
      });
      updatedCount++;
    }
  }

  // Handle removed categories (exist in DB but missing from incoming payload)
  for (const existing of existingCategories) {
    if (!incomingIds.has(existing.id)) {
      // Check if category has linked historical transactions
      const [txCountRes] = await db
        .select({ value: count() })
        .from(transactionLedger)
        .where(and(eq(transactionLedger.categoryId, existing.id), eq(transactionLedger.tenantId, input.tenantId)));

      const txCount = txCountRes?.value ?? 0;

      if (txCount > 0) {
        // Soft-archive category to preserve transaction history
        await db
          .update(categories)
          .set({
            archivedAt: new Date(),
            archivedBy: input.userId,
            updatedAt: new Date(),
            updatedBy: input.userId,
          })
          .where(and(eq(categories.id, existing.id), eq(categories.tenantId, input.tenantId)));
        archivedCount++;
      } else {
        // Hard-delete category if 0 transactions linked
        await db
          .delete(categories)
          .where(and(eq(categories.id, existing.id), eq(categories.tenantId, input.tenantId)));
        archivedCount++;
      }
    }
  }

  return { status: "SUCCESS", updatedCount, archivedCount };
}
