import { pgTable, uuid, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./user.js";
import { tenants } from "./tenant.js";
import { apps } from "./app.js";

export interface AppPreferencesBlob {
  // Household / Cashflow Notification Alerts (Tenant Scoped)
  payday_alerts_enabled?: boolean;
  shortfall_alerts_enabled?: boolean;
  bill_reminders_enabled?: boolean;
  weekly_digest_enabled?: boolean;

  // App-Specific UI Preferences
  /** Whether the Quick Actions panel is collapsed. Default: false. */
  quick_actions_collapsed?: boolean;
  /** Whether decorative UI icons are displayed across views. Default: true. */
  show_icons?: boolean;
  /** Whether filter groups are expanded in list toolbars. Default: false. */
  filters_expanded?: boolean;
  /** Whether to skip popup confirmation when adjusting pool balances. Default: false. */
  skip_pool_adjustment_confirmation?: boolean;

  // Setup / Onboarding completion state
  /** Whether user has completed initial app setup wizard. Default: false. */
  setup_completed?: boolean;
  /** ISO timestamp when setup was completed. */
  setup_completed_at?: string;
}

/**
 * Tenant-and-app-scoped user preferences.
 * Scoped to (userId, tenantId, appId) unique combination.
 * Stores all app/tenant user settings in the app_preferences JSONB column.
 */
export const tenantUserPreferences = pgTable(
  "tenant_user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    appId: uuid("app_id").notNull().references(() => apps.id, { onDelete: "cascade" }),
    // --- All App & Tenant User Preferences Blob ---
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
