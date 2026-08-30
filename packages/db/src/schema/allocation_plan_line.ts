import { pgTable, uuid, numeric, text } from "drizzle-orm/pg-core";
import { allocationPlans } from "./allocation_plan.js";
import { pools } from "./pool.js";
import { categories } from "./category.js";
import { tenantAndTimestamps } from "./base.js";

export const allocationPlanLines = pgTable("allocation_plan_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => allocationPlans.id, { onDelete: "cascade" }).notNull(),
  poolId: uuid("pool_id").references(() => pools.id, { onDelete: "cascade" }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
  proposedAmount: numeric("proposed_amount", { precision: 12, scale: 2 }).notNull(),
  confirmedAmount: numeric("confirmed_amount", { precision: 12, scale: 2 }),
  reasoning: text("reasoning"),
  ...tenantAndTimestamps,
});
