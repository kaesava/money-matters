import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Application-level user profile that mirrors neon_auth.user.
 *
 * DESIGN: id is NOT defaultRandom() — it is the UUID issued by Neon Auth (Better Auth)
 * and must be set explicitly on upsert. The cross-schema FK to neon_auth.user is
 * enforced at the database level via a migration (see drizzle/migrations).
 *
 * This table is platform-level (no tenantId/appId) — users exist independently
 * of tenant membership. The link to a tenant is through household_members.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // == neon_auth.user.id — set by caller, never random
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});
