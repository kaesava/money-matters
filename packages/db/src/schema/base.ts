/**
 * Base Database Schema Mixins
 * 
 * Defines standard audit trail columns (timestamps, user UUIDs, soft delete flags)
 * and mandatory multi-tenant isolation columns (tenantId, appId).
 */
import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Audit trail columns required on all persistent entities per monorepo standards.
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedBy: uuid("archived_by"),
};

/**
 * Combined tenant partitioning and audit metadata mixin for PostgreSQL tables.
 */
export const tenantAndTimestamps = {
  tenantId: uuid("tenant_id").notNull(),
  appId: uuid("app_id").notNull(),
  ...timestamps
};

