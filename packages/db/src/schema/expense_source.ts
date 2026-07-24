import { pgTable, uuid, varchar, numeric, date, integer } from "drizzle-orm/pg-core";
import { categories } from "./category.js";
import { tenantAndTimestamps } from "./base.js";

export const expenseSources = pgTable("expense_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  ...tenantAndTimestamps
});

export const expenseSourceSchedules = pgTable("expense_source_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseSourceId: uuid("expense_source_id").references(() => expenseSources.id).notNull(),
  rrule: varchar("rrule", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  occurrenceCount: integer("occurrence_count"),
  ...tenantAndTimestamps
});
