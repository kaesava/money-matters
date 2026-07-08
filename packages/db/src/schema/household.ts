import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";
import { timestamps, tenantAndTimestamps } from "./base";

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  appId: varchar("app_id", { length: 255 }).notNull(),
  ...timestamps // Household is the tenant, so it doesn't have a tenantId pointing to something else
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // ID coming from Neon Auth
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  // Multi-tenant: User belongs to a single household (for now, 1:1 or M:1)
  householdId: uuid("household_id").references(() => households.id).notNull(),
  ...timestamps
});

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'everyday', 'major', 'bills'
  balance: varchar("balance", { length: 255 }).notNull().default("0"), // Stored as string to avoid precision loss, or numeric
  ...tenantAndTimestamps,
});
