import { pgTable, uuid, varchar, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { bankAccounts } from "./bank_account.js";
import { tenantAndTimestamps } from "./base.js";

export const incomeTypeEnum = pgEnum("income_type_enum", ["SALARIED", "IRREGULAR"]);

export const incomeSources = pgTable("income_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  incomeType: incomeTypeEnum("income_type").notNull().default("SALARIED"),
  receivingAccountId: uuid("receiving_account_id").references(() => bankAccounts.id),
  rrule: varchar("rrule", { length: 255 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  ...tenantAndTimestamps,
});

export type IncomeSource = typeof incomeSources.$inferSelect;
export type NewIncomeSource = typeof incomeSources.$inferInsert;
