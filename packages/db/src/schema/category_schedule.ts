import { pgTable, uuid, numeric, text, date } from "drizzle-orm/pg-core";
import { categories } from "./category.js";
import { tenantAndTimestamps } from "./base.js";

export const categorySchedules = pgTable("category_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }).notNull(),
  rrule: text("rrule"), // iCal Recurrence Rule string
  dueDate: date("due_date"), // Absolute date for one-off targets
  nextDueDate: date("next_due_date"), // Computed/cached target date
  ...tenantAndTimestamps,
});
