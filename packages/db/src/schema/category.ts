import { pgTable, uuid, varchar, integer, boolean, pgEnum, timestamp, numeric } from "drizzle-orm/pg-core";
import { tenants } from "./tenant.js";
import { bankAccounts } from "./bank_account.js";
import { tenantAndTimestamps } from "./base.js";

export const categoryTypeEnum = pgEnum("category_type_enum", ["REGULAR", "GOAL", "EVERYDAY"]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: categoryTypeEnum("type").notNull(),
  isCommitted: boolean("is_committed").notNull().default(false), // GOAL committed targets
  monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }), // REGULAR target amount per month
  isDefaultExcess: boolean("is_default_excess").notNull().default(false),
  icon: varchar("icon", { length: 50 }),
  colour: varchar("colour", { length: 7 }), // Hex color code e.g. '#00B4A6'
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id), // Nullable for V1, populated in V2
  lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  ...tenantAndTimestamps,
});

