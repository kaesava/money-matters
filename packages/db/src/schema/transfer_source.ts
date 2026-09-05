import { pgTable, uuid, varchar, numeric, date } from "drizzle-orm/pg-core";
import { pools } from "./pool.js";
import { tenantAndTimestamps } from "./base.js";

export const transferSources = pgTable("transfer_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  sourcePoolId: uuid("source_pool_id").references(() => pools.id).notNull(),
  destinationPoolId: uuid("destination_pool_id").references(() => pools.id).notNull(),
  rrule: varchar("rrule", { length: 255 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  ...tenantAndTimestamps,
});
