import { timestamp, uuid } from "drizzle-orm/pg-core";

export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: uuid("created_by").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: uuid("updated_by").notNull(),
  archivedAt: timestamp("archived_at"),
};

export const tenantAndTimestamps = {
  tenantId: uuid("tenant_id").notNull(),
  appId: uuid("app_id").notNull(),
  ...timestamps
};
