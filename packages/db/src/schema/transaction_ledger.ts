import { pgTable, uuid, varchar, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";
import { categories } from "./category";
import { incomeAllocationSnapshots } from "./income_allocation";

export const transactionLedger = pgTable("transaction_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  snapshotId: uuid("snapshot_id").references(() => incomeAllocationSnapshots.id),
  flowType: varchar("flow_type", { length: 20 }).notNull(), // 'actual' or 'expected'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  idempotencyKey: text("idempotency_key").unique().notNull(),
  note: text("note"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
