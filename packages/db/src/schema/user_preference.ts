import { pgTable, uuid, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./user.js";

/**
 * Global, app-agnostic user preferences (1:1 per user).
 * Scoped exclusively by `userId` (without tenantId or appId).
 *
 * Contains user-centric, app-agnostic settings:
 * - `timezone`: Physical time zone (default: "Australia/Sydney")
 * - `locale`: Language and regional formatting (default: "en-AU")
 * - `theme`: UI appearance theme (default: "system")
 * - `showIcons`: Global visual icon preference (default: true)
 */
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  timezone: varchar("timezone", { length: 100 }).notNull().default("Australia/Sydney"),
  locale: varchar("locale", { length: 20 }).notNull().default("en-AU"),
  theme: varchar("theme", { length: 20 }).notNull().default("system"),
  showIcons: boolean("show_icons").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
});
