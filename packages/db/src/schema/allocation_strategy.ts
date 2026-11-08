import { pgTable, uuid, varchar, text, boolean, index } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

export const allocationStrategies = pgTable(
  "allocation_strategies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    presetKey: varchar("preset_key", { length: 50 }).notNull().default("BALANCED"),
    description: text("description"),
    isDefault: boolean("is_default").notNull().default(true),
    isPrivate: boolean("is_private").notNull().default(false),
    userId: uuid("user_id"),
    ...tenantAndTimestamps,
  },
  (table) => [
    index("allocation_strategies_tenant_idx").on(table.tenantId),
    index("allocation_strategies_user_idx").on(table.tenantId, table.userId),
  ]
);

export type AllocationStrategy = typeof allocationStrategies.$inferSelect;
export type NewAllocationStrategy = typeof allocationStrategies.$inferInsert;
