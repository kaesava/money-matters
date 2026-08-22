import { pgTable, uuid, pgEnum, varchar, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenant.js";
import { users } from "./user.js";
import { timestamps } from "./base.js";

export const memberRoleEnum = pgEnum("member_role_enum", ["OWNER", "MEMBER"]);
export const inviteStatusEnum = pgEnum("invite_status_enum", ["PENDING", "ACCEPTED", "REVOKED"]);

/**
 * Pivot table linking users to tenants with a role.
 *
 * DESIGN: app_id is intentionally absent. The app context is derived from the
 * parent tenant (tenants.app_id) via JOIN — storing it here would duplicate data
 * with no FK-sync guarantee between tenant_users.app_id and tenants.app_id.
 *
 * A user can belong to multiple tenants. Each tenant belongs to exactly one app.
 * Therefore a user effectively accesses multiple apps by having multiple tenants.
 *
 * user_id is nullable to support PENDING invite rows (invited by email, no account yet).
 * A CHECK constraint (migration 0015) enforces: ACCEPTED rows must have a non-null user_id.
 * A partial unique index (migration 0015) prevents duplicate ACCEPTED memberships per tenant/user.
 */
export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  // Nullable for PENDING invitations. Non-null guaranteed for ACCEPTED by DB CHECK constraint.
  userId: uuid("user_id").references(() => users.id),
  inviteEmail: varchar("invite_email", { length: 255 }),
  role: memberRoleEnum("role").notNull().default("MEMBER"),
  inviteToken: uuid("invite_token"),
  inviteStatus: inviteStatusEnum("invite_status").notNull().default("ACCEPTED"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
});
