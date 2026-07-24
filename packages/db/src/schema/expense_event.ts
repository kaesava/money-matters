import { pgTable, uuid, numeric, pgEnum, date, varchar } from "drizzle-orm/pg-core";
import { expenseSources } from "./expense_source.js";
import { categories } from "./category.js";
import { tenantAndTimestamps } from "./base.js";

export const expenseEventStatusEnum = pgEnum("expense_event_status_enum", ["UPCOMING", "PAID", "CANCELLED"]);

export const expenseEvents = pgTable("expense_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseSourceId: uuid("expense_source_id").references(() => expenseSources.id),
  categoryId: uuid("category_id").references(() => categories.id),
  name: varchar("name", { length: 255 }).notNull(),
  expectedDate: date("expected_date").notNull(),
  expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }).notNull(),
  actualAmount: numeric("actual_amount", { precision: 12, scale: 2 }),
  note: varchar("note", { length: 500 }),
  status: expenseEventStatusEnum("status").notNull().default("UPCOMING"),
  ...tenantAndTimestamps,
});
