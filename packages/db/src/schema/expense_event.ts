import { pgTable, uuid, numeric, pgEnum, date, varchar, boolean, index } from "drizzle-orm/pg-core";
import { envelopes } from "./envelope.js";
import { tenantAndTimestamps } from "./base.js";

export const expenseEventStatusEnum = pgEnum("expense_event_status_enum", ["PENDING", "CONFIRMED"]);

export const expenseEvents = pgTable(
  "expense_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    envelopeId: uuid("envelope_id").references(() => envelopes.id).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    expectedDate: date("expected_date").notNull(),
    actualDate: date("actual_date"),
    expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }).notNull(),
    actualAmount: numeric("actual_amount", { precision: 12, scale: 2 }),
    isScheduled: boolean("is_scheduled").default(false).notNull(),
    note: varchar("note", { length: 500 }),
    status: expenseEventStatusEnum("status").notNull().default("PENDING"),
    ...tenantAndTimestamps,
  },
  (table) => ({
    tenantEnvelopeDateIdx: index("expense_events_tenant_envelope_date_idx").on(
      table.tenantId,
      table.envelopeId,
      table.expectedDate
    ),
  })
);

export type ExpenseEvent = typeof expenseEvents.$inferSelect;
export type NewExpenseEvent = typeof expenseEvents.$inferInsert;
