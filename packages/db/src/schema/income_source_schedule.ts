import { pgTable, uuid, text, date, integer } from "drizzle-orm/pg-core";
import { incomeSources } from "./income.js";
import { tenantAndTimestamps } from "./base.js";

export const incomeSourceSchedules = pgTable("income_source_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  incomeSourceId: uuid("income_source_id").references(() => incomeSources.id).notNull(),
  rrule: text("rrule").notNull(), // iCal Recurrence Rule
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  occurrenceCount: integer("occurrence_count"),
  nextOccurrenceDate: date("next_occurrence_date"),
  ...tenantAndTimestamps,
});
