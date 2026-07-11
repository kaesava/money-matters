import { pgTable, uuid, varchar, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { households } from "./household.js";
import { tenantAndTimestamps } from "./base.js";

// V1 simplified bank accounts mapping
export const accountPurposeEnum = pgEnum("account_purpose_enum", ["INCOME_LANDING", "SAVINGS", "EVERYDAY"]);

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  // Array of purposes - an account can be an income landing AND a savings / everyday account
  purpose: varchar("purpose", { length: 50 }).array().notNull(), 
  lastKnownBalance: numeric("last_known_balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  isOffset: boolean("is_offset").notNull().default(false),
  ...tenantAndTimestamps,
});
