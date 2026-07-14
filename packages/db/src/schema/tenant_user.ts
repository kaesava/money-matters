import { pgTable, uuid, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenant.js";
import { users } from "./user.js";
import { timestamps } from "./base.js";

export const memberRoleEnum = pgEnum("member_role_enum", ["OWNER", "MEMBER"]);
export const inviteStatusEnum = pgEnum("invite_status_enum", ["PENDING", "ACCEPTED", "REVOKED"]);

export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  /** References public.users.id which in turn references neon_auth.user.id */
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: memberRoleEnum("role").notNull().default("MEMBER"),
  inviteToken: uuid("invite_token"),
  inviteStatus: inviteStatusEnum("invite_status").notNull().default("ACCEPTED"),
  appId: uuid("app_id").notNull(),
  ...timestamps
});
