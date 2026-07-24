import { pgTable, uuid, varchar, numeric } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  lastKnownBalance: numeric("last_known_balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  unbudgetedBuffer: numeric("unbudgeted_buffer", { precision: 12, scale: 2 }).notNull().default("0.00"),
  ...tenantAndTimestamps,
});
