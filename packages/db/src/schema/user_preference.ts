import { pgTable, uuid, boolean, timestamp, varchar } from "drizzle-orm/pg-core";

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  quickActionsCollapsed: boolean("quick_actions_collapsed").notNull().default(false),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  paydayAlertsEnabled: boolean("payday_alerts_enabled").notNull().default(true),
  shortfallAlertsEnabled: boolean("shortfall_alerts_enabled").notNull().default(true),
  billRemindersEnabled: boolean("bill_reminders_enabled").notNull().default(true),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
