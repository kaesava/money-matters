import { pgTable, uuid, varchar, integer, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { timestamps } from "./base.js";
import { apps } from "./app.js";

/**
 * App Version Registry & Compatibility Table
 * 
 * Tracks releases, build numbers, minimum supported API versions, and release notes per app.
 */
export const appVersions = pgTable("app_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id").notNull().references(() => apps.id),
  version: varchar("version", { length: 50 }).notNull(),
  buildNumber: integer("build_number").notNull().default(1),
  channel: varchar("channel", { length: 20 }).notNull().default("production"),
  minSupportedApiVersion: varchar("min_supported_api_version", { length: 50 }).notNull().default("1.0.0"),
  releaseNotes: text("release_notes"),
  isMandatoryUpdate: boolean("is_mandatory_update").notNull().default(false),
  releasedAt: timestamp("released_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});
