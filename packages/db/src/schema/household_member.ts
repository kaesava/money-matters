import { pgTable, uuid, pgEnum } from "drizzle-orm/pg-core";
import { households } from "./household.js";
import { users } from "./user.js";
import { tenantAndTimestamps } from "./base.js";

export const memberRoleEnum = pgEnum("member_role_enum", ["OWNER", "MEMBER"]);
export const inviteStatusEnum = pgEnum("invite_status_enum", ["PENDING", "ACCEPTED", "REVOKED"]);

export const householdMembers = pgTable("household_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id).notNull(),
  /** References public.users.id which in turn references neon_auth.user.id */
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: memberRoleEnum("role").notNull().default("MEMBER"),
  inviteToken: uuid("invite_token"),
  inviteStatus: inviteStatusEnum("invite_status").notNull().default("ACCEPTED"),
  ...tenantAndTimestamps
});
