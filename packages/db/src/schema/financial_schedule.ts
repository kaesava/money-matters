import { pgTable, uuid, text, date, numeric, pgEnum } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";
import { categories } from "./category";

export const directionEnum = pgEnum("direction_enum", ["IN", "OUT"]);
export const incomeScheduleTypeEnum = pgEnum("income_schedule_type_enum", ["recurring", "one_off", "uncertain"]);

export const financialSchedules = pgTable("financial_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id),
  direction: directionEnum("direction").notNull(),
  incomeType: incomeScheduleTypeEnum("income_type"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  frequencyCron: text("frequency_cron"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  ...tenantAndTimestamps,
});
