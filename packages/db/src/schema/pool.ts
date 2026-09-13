import { pgTable, uuid, varchar, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { bankAccounts } from "./bank_account.js";

export const poolTypeEnum = pgEnum("pool_type_enum", ["EVERYDAY", "REGULAR", "GOAL"]);

export const pools = pgTable("pools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  poolType: poolTypeEnum("pool_type").notNull(),
  bankAccountId: uuid("bank_account_id")
    .references(() => bankAccounts.id, { onDelete: "cascade" })
    .notNull(),

  // EVERYDAY-specific fields
  everydayAllowanceAmount: numeric("everyday_allowance_amount", { precision: 12, scale: 2 }),

  // GOAL-specific fields
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }),
  targetDate: varchar("target_date", { length: 50 }),

  isCommitted: boolean("is_committed").notNull().default(false),
  isSurplusTarget: boolean("is_surplus_target").notNull().default(false),

  ...tenantAndTimestamps,
});

