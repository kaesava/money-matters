import { pgTable, uuid, varchar, numeric, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenant.js";
import { bankAccounts } from "./bank_account.js";
import { tenantAndTimestamps } from "./base.js";

export const incomeSourceTypeEnum = pgEnum("income_source_type_enum", ["SALARY", "WAGES", "FREELANCE", "OTHER"]);

export const incomeSources = pgTable("income_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: incomeSourceTypeEnum("type").notNull().default("SALARY"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  receivingAccountId: uuid("receiving_account_id").references(() => bankAccounts.id),
  ...tenantAndTimestamps
});
