import { pgTable, uuid, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

/**
 * User-level preferences scoped to a tenant.
 *
 * Global preferences (timezone, notification toggles) apply across all apps.
 * App-specific preferences (UI state like collapsed panels) are stored in the
 * `app_preferences` JSONB blob, keyed by appId.
 *
 * Example appPreferences:
 * {
 *   "01908bde-34bb-7b19-a178-574211bc93aa": {
 *     "quick_actions_collapsed": true
 *   }
 * }
 */
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  // --- Global preferences (app-agnostic) ---
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  paydayAlertsEnabled: boolean("payday_alerts_enabled").notNull().default(true),
  shortfallAlertsEnabled: boolean("shortfall_alerts_enabled").notNull().default(true),
  billRemindersEnabled: boolean("bill_reminders_enabled").notNull().default(true),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").notNull().default(false),
  // --- App-specific preferences ---
  // Keyed by appId. Each value is an AppPreferencesBlob.
  // Allows the same user_preferences table to serve multiple apps
  // without coupling app-specific UI state into typed columns.
  appPreferences: jsonb("app_preferences").$type<Record<string, AppPreferencesBlob>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * App-specific user preference blob.
 * One of these objects is stored per appId in appPreferences.
 */
export interface AppPreferencesBlob {
  /** Whether the Quick Actions panel is collapsed. Default: false. */
  quick_actions_collapsed?: boolean;
}
