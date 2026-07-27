import { pgTable, uuid, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { categoryTypeEnum } from "./category.js";

/**
 * App-level category templates. NOT tenant-scoped.
 *
 * These rows act as a template that is copied into the `categories` table
 * every time a new tenant is created (in createTenantHandler).
 *
 * Constraints:
 * - No tenantId column — these are app-level, not tenant-level.
 * - No archivedAt / archivedBy — these templates are not soft-deleted.
 *   Delete them physically if needed.
 */
export const appCategories = pgTable("app_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: categoryTypeEnum("type").notNull(),
  icon: varchar("icon", { length: 50 }),
  colour: varchar("colour", { length: 7 }),
  /**
   * Annualised target amount in AUD.
   * Divide by 12 to get monthly equivalent for the categories.monthly_amount.
   * Divide by 26 for fortnightly. Null means no suggested amount.
   */
  annualisedAmount: numeric("annualised_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").notNull(),
});
