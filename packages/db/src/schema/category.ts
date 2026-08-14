import { pgTable, uuid, varchar, integer, boolean, pgEnum, timestamp, numeric } from "drizzle-orm/pg-core";
import { tenants } from "./tenant.js";
import { tenantAndTimestamps } from "./base.js";

export const categoryTypeEnum = pgEnum("category_type_enum", ["REGULAR", "GOAL", "EVERYDAY"]);
export const rolloverRuleEnum = pgEnum("rollover_rule_enum", ["ROLLOVER", "SWEEP", "RESET"]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: categoryTypeEnum("type").notNull(),
  isCommitted: boolean("is_committed").notNull().default(false), // GOAL committed targets
  isEssential: boolean("is_essential").notNull().default(false), // REGULAR essential priority bill (Rent, Utilities)
  monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }), // REGULAR target amount per month

  everydayAllowanceAmount: numeric("everyday_allowance_amount", { precision: 12, scale: 2 }), // EVERYDAY target allowance per paycheck
  enteredAmount: numeric("entered_amount", { precision: 12, scale: 2 }), // Target amount entered by user in the UI
  rolloverRule: rolloverRuleEnum("rollover_rule").notNull().default('ROLLOVER'),
  icon: varchar("icon", { length: 50 }),
  colour: varchar("colour", { length: 7 }), // Hex color code e.g. '#00B4A6'
  budgetFrequency: varchar("budget_frequency", { length: 20 }).default("MONTHLY"), // FORTNIGHTLY, MONTHLY, ANNUALLY
  isSurplusTarget: boolean("is_surplus_target").notNull().default(false), // Designated sweep target category for surplus residual funds
  lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  ...tenantAndTimestamps,
});


