import { pgTable, uuid, varchar, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { poolTypeEnum } from "./pool.js";

/**
 * App-level pool templates. NOT tenant-scoped.
 */
export const appCategories = pgTable("app_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: poolTypeEnum("type").notNull(),
  icon: varchar("icon", { length: 50 }),
  colour: varchar("colour", { length: 7 }),
  annualisedAmount: numeric("annualised_amount", { precision: 12, scale: 2 }),
  isSurplusTarget: boolean("is_surplus_target").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").notNull(),
});
