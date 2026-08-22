import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
