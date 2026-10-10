import { pgTable, uuid, varchar, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { bankAccounts } from "./bank_account.js";

export const poolTypeEnum = pgEnum("pool_type_enum", ["EVERYDAY", "REGULAR", "GOAL"]);
export const goalModeEnum = pgEnum("goal_mode_enum", ["TARGET_DATE", "ONGOING"]);

export const pools = pgTable("pools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  poolType: poolTypeEnum("pool_type").notNull(),
  bankAccountId: uuid("bank_account_id")
    .references(() => bankAccounts.id, { onDelete: "cascade" })
    .notNull(),

  // EVERYDAY-specific fields
  everydayAllowanceAmount: numeric("everyday_allowance_amount", { precision: 12, scale: 2 }),
  safetyBufferFloor: numeric("safety_buffer_floor", { precision: 12, scale: 2 }).default("0.00"),

  // GOAL-specific fields
  goalMode: goalModeEnum("goal_mode").default("TARGET_DATE"),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }),
  targetDate: varchar("target_date", { length: 50 }),
  enteredAmount: numeric("entered_amount", { precision: 12, scale: 2 }),
  budgetFrequency: varchar("budget_frequency", { length: 50 }).default("MONTHLY"),
  startDate: varchar("start_date", { length: 50 }),
  rrule: varchar("rrule", { length: 255 }),

  isCommitted: boolean("is_committed").notNull().default(false),
  isSurplusTarget: boolean("is_surplus_target").notNull().default(false),

  ...tenantAndTimestamps,
});

