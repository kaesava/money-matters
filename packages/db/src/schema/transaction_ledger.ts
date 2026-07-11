import { pgTable, uuid, numeric, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { categories } from "./category.js";
import { bankAccounts } from "./bank_account.js";
import { allocationPlanLines } from "./allocation_plan_line.js";
import { tenantAndTimestamps } from "./base.js";

export const transactionFlowEnum = pgEnum("transaction_flow_enum", ["DEBIT", "CREDIT"]);

export const transactionLedger = pgTable("transaction_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id), // Nullable in V1, tracks associated bank flow
  planLineId: uuid("plan_line_id").references(() => allocationPlanLines.id), // Ties confirmed allocation line splits to ledger credits
  flowType: transactionFlowEnum("flow_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  idempotencyKey: text("idempotency_key").unique().notNull(),
  note: text("note"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
