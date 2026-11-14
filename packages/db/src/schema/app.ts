import { pgTable, uuid, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { type AppFeatureFlags, DEFAULT_APP_FEATURE_FLAGS } from "@money-matters/types";

/**
 * Application registry. Each row represents a distinct product (e.g. Money Matters).
 *
 * id is NOT defaultRandom() — the canonical Money Matters app UUID is stable
 * across all environments and seeded deterministically via migration 0015.
 * Never generate a random app ID at runtime.
 *
 * Canonical UUID: 01908bde-34bb-7b19-a178-574211bc93aa (money-matters)
 */
export const apps = pgTable("apps", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  featureFlags: jsonb("feature_flags").$type<AppFeatureFlags>().default(DEFAULT_APP_FEATURE_FLAGS).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedBy: uuid("archived_by"),
});

