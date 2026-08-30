import { pgTable, uuid, varchar, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { pools } from "./pool.js";

export { poolTypeEnum, rolloverRuleEnum } from "./pool.js";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  poolId: uuid("pool_id")
    .references(() => pools.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),

  monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }),
  enteredAmount: numeric("entered_amount", { precision: 12, scale: 2 }),
  budgetFrequency: varchar("budget_frequency", { length: 50 }).default("MONTHLY"),

  isEssential: boolean("is_essential").default(false).notNull(),
  icon: varchar("icon", { length: 100 }),
  colour: varchar("colour", { length: 20 }),

  ...tenantAndTimestamps,
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
