import { pgTable, uuid, varchar, numeric } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull(), // 'everyday', 'bills', 'major', 'offset'
  lastKnownBalance: numeric("last_known_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  ...tenantAndTimestamps,
});
