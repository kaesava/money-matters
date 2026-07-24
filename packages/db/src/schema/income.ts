import { pgTable, uuid, varchar, numeric } from "drizzle-orm/pg-core";
import { bankAccounts } from "./bank_account.js";
import { tenantAndTimestamps } from "./base.js";

export const incomeSources = pgTable("income_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  receivingAccountId: uuid("receiving_account_id").references(() => bankAccounts.id),
  ...tenantAndTimestamps
});
