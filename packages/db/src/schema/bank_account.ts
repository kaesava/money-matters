import { pgTable, uuid, varchar, numeric, pgEnum } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";

export const accountTypeEnum = pgEnum("account_type_enum", ["everyday", "bills", "major", "offset"]);

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountType: accountTypeEnum("account_type").notNull(),
  lastKnownBalance: numeric("last_known_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  ...tenantAndTimestamps,
});
