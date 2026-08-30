import { pgTable, uuid, numeric, pgEnum, date, boolean, varchar } from "drizzle-orm/pg-core";
import { incomeSources } from "./income.js";
import { tenantAndTimestamps } from "./base.js";

export const incomeEventStatusEnum = pgEnum("income_event_status_enum", ["UPCOMING", "SKIPPED", "DRAFT", "REVIEWED", "CONFIRMED"]);

export const incomeEvents = pgTable("income_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  incomeSourceId: uuid("income_source_id").references(() => incomeSources.id),
  name: varchar("name", { length: 255 }),
  expectedDate: date("expected_date").notNull(),

  expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }).notNull(),
  actualAmount: numeric("actual_amount", { precision: 12, scale: 2 }),
  note: varchar("note", { length: 500 }),
  isOverridden: boolean("is_overridden").notNull().default(false),
  paymentMethod: varchar("payment_method", { length: 50 }),
  status: incomeEventStatusEnum("status").notNull().default("UPCOMING"),
  ...tenantAndTimestamps,
});
