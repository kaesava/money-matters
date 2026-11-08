import { pgTable, uuid, integer, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { allocationStrategies } from "./allocation_strategy.js";
import { envelopes } from "./envelope.js";

export const allocationStepTypeEnum = pgEnum("allocation_step_type_enum", [
  "IMMEDIATE_BILLS",
  "DEFICIT_REPAIR",
  "BILLS_SAFETY_FLOOR",
  "PRO_RATA_BILLS",
  "EVERYDAY_ALLOWANCE",
  "COMMITTED_GOALS",
  "STANDARD_GOALS",
  "FIXED_AMOUNT",
  "PERCENTAGE_SPLIT",
  "SURPLUS_SWEEP",
]);

export const allocationStrategySteps = pgTable(
  "allocation_strategy_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: uuid("strategy_id")
      .references(() => allocationStrategies.id, { onDelete: "cascade" })
      .notNull(),
    orderIndex: integer("order_index").notNull(),
    stepType: allocationStepTypeEnum("step_type").notNull(),
    targetEnvelopeId: uuid("target_envelope_id")
      .references(() => envelopes.id, { onDelete: "set null" }),
    config: jsonb("config"),
    ...tenantAndTimestamps,
  },
  (table) => [
    index("allocation_strategy_steps_strategy_idx").on(table.strategyId, table.orderIndex),
    index("allocation_strategy_steps_target_env_idx").on(table.targetEnvelopeId),
  ]
);

export type AllocationStrategyStep = typeof allocationStrategySteps.$inferSelect;
export type NewAllocationStrategyStep = typeof allocationStrategySteps.$inferInsert;
