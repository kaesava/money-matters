import { pgTable, uuid, varchar, numeric, date } from "drizzle-orm/pg-core";
import { pools } from "./pool.js";
import { categories } from "./category.js";
import { tenantAndTimestamps } from "./base.js";

export const expenseSources = pgTable("expense_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  poolId: uuid("pool_id").references(() => pools.id).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  rrule: varchar("rrule", { length: 255 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  ...tenantAndTimestamps,
});
