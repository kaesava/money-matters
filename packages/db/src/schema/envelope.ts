import { pgTable, uuid, varchar, numeric, boolean, pgEnum, integer } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { bankAccounts } from "./bank_account.js";

export const envelopeTypeEnum = pgEnum("envelope_type_enum", [
  "EVERYDAY",
  "SCHEDULED_BILL",
  "FLEXIBLE_BILL",
  "TARGET_GOAL",
  "ONGOING_GOAL",
]);

export const goalModeEnum = pgEnum("goal_mode_enum", ["TARGET_DATE", "ONGOING"]);

export const envelopes = pgTable("envelopes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  envelopeType: envelopeTypeEnum("envelope_type").notNull(),
  bankAccountId: uuid("bank_account_id")
    .references(() => bankAccounts.id, { onDelete: "cascade" })
    .notNull(),

  // Living allowance / EVERYDAY fields
  everydayAllowanceAmount: numeric("everyday_allowance_amount", { precision: 12, scale: 2 }),
  safetyBufferFloor: numeric("safety_buffer_floor", { precision: 12, scale: 2 }).default("0.00"),

  // Recurring & Target Fields
  monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }),
  enteredAmount: numeric("entered_amount", { precision: 12, scale: 2 }),
  budgetFrequency: varchar("budget_frequency", { length: 50 }).default("MONTHLY"),
  startDate: varchar("start_date", { length: 50 }),
  endDate: varchar("end_date", { length: 50 }),
  rrule: varchar("rrule", { length: 255 }),

  // Goals
  goalMode: goalModeEnum("goal_mode").default("TARGET_DATE"),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }),
  targetDate: varchar("target_date", { length: 50 }),

  // Flags & Meta
  isEssential: boolean("is_essential").notNull().default(false),
  isCommitted: boolean("is_committed").notNull().default(false),
  isSurplusTarget: boolean("is_surplus_target").notNull().default(false),
  isPrivate: boolean("is_private").notNull().default(false),
  userId: uuid("user_id"), // Applicable for private envelopes
  icon: varchar("icon", { length: 100 }),
  orderIndex: integer("order_index").notNull().default(0),

  ...tenantAndTimestamps,
});

export type Envelope = typeof envelopes.$inferSelect;
export type NewEnvelope = typeof envelopes.$inferInsert;
