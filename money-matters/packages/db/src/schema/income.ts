import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";
import { bankAccounts } from "./household";

export const incomeSources = pgTable("income_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: varchar("amount", { length: 255 }).notNull(),
  recurrenceRule: text("recurrence_rule"),
  nextExpectedDate: timestamp("next_expected_date"),
  receivingAccountId: uuid("receiving_account_id").references(() => bankAccounts.id),
  ...tenantAndTimestamps
});
