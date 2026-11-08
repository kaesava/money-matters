import { z } from "zod";
import { BaseSchema } from "./tenant.types.js";

export const AllocationStepTypeEnum = z.enum([
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
export type AllocationStepType = z.infer<typeof AllocationStepTypeEnum>;

export const AllocationPresetKeyEnum = z.enum([
  "BALANCED",
  "BILLS_FORTRESS",
  "PAY_YOURSELF_FIRST",
  "CUSTOM",
]);
export type AllocationPresetKey = z.infer<typeof AllocationPresetKeyEnum>;

export const AllocationStrategyStepSchema = BaseSchema.extend({
  strategyId: z.string().uuid(),
  orderIndex: z.number().int().min(0),
  stepType: AllocationStepTypeEnum,
  targetEnvelopeId: z.string().uuid().nullable().optional(),
  config: z.record(z.unknown()).nullable().optional(),
}).strict();
export type AllocationStrategyStepType = z.infer<typeof AllocationStrategyStepSchema>;

export const AllocationStrategySchema = BaseSchema.extend({
  name: z.string().min(1),
  presetKey: AllocationPresetKeyEnum,
  description: z.string().nullable().optional(),
  isDefault: z.boolean().default(true),
  steps: z.array(AllocationStrategyStepSchema).optional(),
}).strict();
export type AllocationStrategyType = z.infer<typeof AllocationStrategySchema>;

export const ApplyAllocationPresetCommand = z.object({
  presetKey: z.enum(["BALANCED", "BILLS_FORTRESS", "PAY_YOURSELF_FIRST"]),
}).strict();
export type ApplyAllocationPresetCommandType = z.infer<typeof ApplyAllocationPresetCommand>;

export const UpdateAllocationStrategyStepsCommand = z.object({
  strategyId: z.string().uuid(),
  steps: z.array(
    z.object({
      id: z.string().uuid().optional(),
      orderIndex: z.number().int().min(0),
      stepType: AllocationStepTypeEnum,
      targetEnvelopeId: z.string().uuid().nullable().optional(),
      config: z.record(z.unknown()).nullable().optional(),
    }).strict()
  ),
}).strict();
export type UpdateAllocationStrategyStepsCommandType = z.infer<typeof UpdateAllocationStrategyStepsCommand>;
