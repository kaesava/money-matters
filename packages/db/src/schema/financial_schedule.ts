import { pgTable, uuid, varchar, text, date, numeric } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";
import { categories } from "./category";

export const financialSchedules = pgTable("financial_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id),
  direction: varchar("direction", { length: 10 }).notNull(), // 'IN' or 'OUT'
  incomeType: varchar("income_type", { length: 20 }), // 'recurring', 'one_off', 'uncertain'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  frequencyCron: text("frequency_cron"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  ...tenantAndTimestamps,
});
