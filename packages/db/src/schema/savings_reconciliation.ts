import { pgTable, uuid, numeric, timestamp } from "drizzle-orm/pg-core";
import { bankAccounts } from "./bank_account.js";
import { tenantAndTimestamps } from "./base.js";

export const savingsReconciliations = pgTable("savings_reconciliations", {
  id: uuid("id").primaryKey().defaultRandom(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id).notNull(),
  expectedBalance: numeric("expected_balance", { precision: 12, scale: 2 }).notNull(),
  actualBalance: numeric("actual_balance", { precision: 12, scale: 2 }).notNull(),
  delta: numeric("delta", { precision: 12, scale: 2 }).notNull(),
  reconciledAt: timestamp("reconciled_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
