import { pgTable, uuid, numeric, pgEnum } from "drizzle-orm/pg-core";
import { categories } from "./category.js";
import { tenantAndTimestamps } from "./base.js";

export const shortfallStatusEnum = pgEnum("shortfall_status_enum", ["BORROWED", "PARTIAL", "REPAID"]);

export const shortfallEvents = pgTable("shortfall_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  donorCategoryId: uuid("donor_category_id").references(() => categories.id).notNull(),
  recipientCategoryId: uuid("recipient_category_id").references(() => categories.id).notNull(),
  borrowedAmount: numeric("borrowed_amount", { precision: 12, scale: 2 }).notNull(),
  repaidAmount: numeric("repaid_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  status: shortfallStatusEnum("status").notNull().default("BORROWED"),
  ...tenantAndTimestamps,
});
