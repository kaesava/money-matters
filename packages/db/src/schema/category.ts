import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";
import { households } from "./household";

export const categoryGroups = pgTable("category_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  ...tenantAndTimestamps
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'major', 'bills', 'everyday'
  groupId: uuid("group_id").references(() => categoryGroups.id),
  isDefaultExcess: boolean("is_default_excess").default(false), // e.g. Emergency Fund
  ...tenantAndTimestamps
});

export const categoryBudgets = pgTable("category_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  annualAmount: varchar("annual_amount", { length: 255 }), // Can be null if it's dynamic
  priority: varchar("priority", { length: 50 }).notNull(), // for everyday: 50%, 75%, 100%. for others: ranks
  recurrenceRule: text("recurrence_rule"), // RRULE string
  nextDueDate: timestamp("next_due_date"),
  ...tenantAndTimestamps
});
