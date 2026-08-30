import { pgTable, uuid, numeric, pgEnum, date, varchar, boolean } from "drizzle-orm/pg-core";
import { expenseSources } from "./expense_source.js";
import { pools } from "./pool.js";
import { categories } from "./category.js";
import { tenantAndTimestamps } from "./base.js";

export const expenseEventStatusEnum = pgEnum("expense_event_status_enum", ["UPCOMING", "SKIPPED", "PAID", "CANCELLED"]);

export const expenseEvents = pgTable("expense_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseSourceId: uuid("expense_source_id").references(() => expenseSources.id),
  poolId: uuid("pool_id").references(() => pools.id).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  name: varchar("name", { length: 255 }).notNull(),
  expectedDate: date("expected_date").notNull(),
  expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }).notNull(),
  actualAmount: numeric("actual_amount", { precision: 12, scale: 2 }),
  note: varchar("note", { length: 500 }),
  isOverridden: boolean("is_overridden").notNull().default(false),
  paymentMethod: varchar("payment_method", { length: 50 }),
  status: expenseEventStatusEnum("status").notNull().default("UPCOMING"),
  ...tenantAndTimestamps,
});
