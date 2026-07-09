import { pgTable, uuid, numeric, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";
import { financialSchedules } from "./financial_schedule";

export const snapshotStatusEnum = pgEnum("snapshot_status_enum", ["draft", "user_confirmed"]);

export const incomeAllocationSnapshots = pgTable("income_allocation_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("schedule_id").references(() => financialSchedules.id).notNull(),
  incomeAmount: numeric("income_amount", { precision: 12, scale: 2 }).notNull(),
  status: snapshotStatusEnum("status").notNull().default("draft"),
  allocationSplitsManifest: jsonb("allocation_splits_manifest").notNull(),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
