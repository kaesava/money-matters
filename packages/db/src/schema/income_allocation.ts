import { pgTable, uuid, varchar, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";
import { financialSchedules } from "./financial_schedule";

export const incomeAllocationSnapshots = pgTable("income_allocation_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("schedule_id").references(() => financialSchedules.id).notNull(),
  incomeAmount: numeric("income_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // 'draft', 'user_confirmed'
  allocationSplitsManifest: jsonb("allocation_splits_manifest").notNull(),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
