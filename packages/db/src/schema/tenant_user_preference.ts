import { pgTable, uuid, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./user.js";
import { tenants } from "./tenant.js";
import { apps } from "./app.js";

export interface AppPreferencesBlob {
  /** Whether the Quick Actions panel is collapsed. Default: false. */
  quick_actions_collapsed?: boolean;
  /** Whether decorative UI icons are displayed across views. Default: true. */
  show_icons?: boolean;
  /** Whether filter groups are expanded in list toolbars. Default: false. */
  filters_expanded?: boolean;
  /** Whether to skip popup confirmation when adjusting pool balances. Default: false. */
  skip_pool_adjustment_confirmation?: boolean;
}

/**
 * Tenant-and-app-scoped user preferences.
 * Scoped to (userId, tenantId, appId) unique combination.
 * Stores tenant cashflow notification alerts and app-specific UI flags.
 */
export const tenantUserPreferences = pgTable(
  "tenant_user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    appId: uuid("app_id").notNull().references(() => apps.id, { onDelete: "cascade" }),
    // --- Household / Cashflow Notification Alerts (Tenant Scoped) ---
    paydayAlertsEnabled: boolean("payday_alerts_enabled").notNull().default(true),
    shortfallAlertsEnabled: boolean("shortfall_alerts_enabled").notNull().default(true),
    billRemindersEnabled: boolean("bill_reminders_enabled").notNull().default(true),
    weeklyDigestEnabled: boolean("weekly_digest_enabled").notNull().default(false),
    // --- App-Specific UI Preferences Blob ---
    appPreferences: jsonb("app_preferences").$type<Record<string, AppPreferencesBlob>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("idx_tenant_user_prefs_unique").on(table.userId, table.tenantId, table.appId),
  ]
);
