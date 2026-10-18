import { pgTable, uuid, integer, date, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenant.js";

/**
 * Tracks monthly AI usage metrics per tenant to enforce quotas and cost controls.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    periodMonth: date("period_month").notNull(), // First day of billing month: YYYY-MM-01
    llmCalls: integer("llm_calls").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("ai_usage_tenant_period_idx").on(table.tenantId, table.periodMonth),
    index("ai_usage_tenant_id_idx").on(table.tenantId),
  ]
);

export type AiUsage = typeof aiUsage.$inferSelect;
export type NewAiUsage = typeof aiUsage.$inferInsert;
