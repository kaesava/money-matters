import { pgTable, uuid, numeric, pgEnum, date, varchar, boolean } from "drizzle-orm/pg-core";
import { transferSources } from "./transfer_source.js";
import { pools } from "./pool.js";
import { tenantAndTimestamps } from "./base.js";

export const transferEventStatusEnum = pgEnum("transfer_event_status_enum", ["UPCOMING", "SKIPPED", "COMPLETED", "CANCELLED"]);

export const transferEvents = pgTable("transfer_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  transferSourceId: uuid("transfer_source_id").references(() => transferSources.id),
  sourcePoolId: uuid("source_pool_id").references(() => pools.id).notNull(),
  destinationPoolId: uuid("destination_pool_id").references(() => pools.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  expectedDate: date("expected_date").notNull(),
  expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }).notNull(),
  actualAmount: numeric("actual_amount", { precision: 12, scale: 2 }),
  note: varchar("note", { length: 500 }),
  isOverridden: boolean("is_overridden").notNull().default(false),
  status: transferEventStatusEnum("status").notNull().default("UPCOMING"),
  ...tenantAndTimestamps,
});
