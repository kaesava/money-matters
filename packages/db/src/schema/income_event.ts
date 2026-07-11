import { pgTable, uuid, numeric, pgEnum, date } from "drizzle-orm/pg-core";
import { incomeSources } from "./income.js";
import { tenantAndTimestamps } from "./base.js";

export const incomeEventStatusEnum = pgEnum("income_event_status_enum", ["UPCOMING", "DRAFT", "REVIEWED", "CONFIRMED"]);

export const incomeEvents = pgTable("income_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  incomeSourceId: uuid("income_source_id").references(() => incomeSources.id).notNull(),
  expectedDate: date("expected_date").notNull(),
  expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }).notNull(),
  actualAmount: numeric("actual_amount", { precision: 12, scale: 2 }),
  status: incomeEventStatusEnum("status").notNull().default("UPCOMING"),
  ...tenantAndTimestamps,
});
