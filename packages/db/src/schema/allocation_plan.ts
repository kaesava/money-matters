import { pgTable, uuid, numeric, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { incomeEvents } from "./income_event.js";
import { tenantAndTimestamps } from "./base.js";

export const allocationPlanStatusEnum = pgEnum("allocation_plan_status_enum", ["DRAFT", "REVIEWED", "CONFIRMED"]);

export const allocationPlans = pgTable("allocation_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  incomeEventId: uuid("income_event_id").references(() => incomeEvents.id).notNull(),
  status: allocationPlanStatusEnum("status").notNull().default("DRAFT"),
  totalIncomeAmount: numeric("total_income_amount", { precision: 12, scale: 2 }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  ...tenantAndTimestamps,
});
