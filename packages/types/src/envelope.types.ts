import { z } from "zod";
import { BaseSchema } from "./tenant.types.js";

export const EnvelopeHealthStatusSchema = z.enum(["GREEN", "AMBER", "RED"]);
export type EnvelopeHealthStatus = z.infer<typeof EnvelopeHealthStatusSchema>;

export const EnvelopeTypeSchema = z.enum([
  "EVERYDAY",
  "SCHEDULED_BILL",
  "FLEXIBLE_BILL",
  "TARGET_GOAL",
  "ONGOING_GOAL",
]);
export type EnvelopeType = z.infer<typeof EnvelopeTypeSchema>;
export const EnvelopeTypeEnum = EnvelopeTypeSchema;

export const GoalModeSchema = z.enum(["TARGET_DATE", "ONGOING"]);
export type GoalMode = z.infer<typeof GoalModeSchema>;
export const GoalModeEnum = GoalModeSchema;

/**
 * Schema defining flat Envelopes directly linked to Bank Accounts.
 */
export const EnvelopeSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  envelopeType: EnvelopeTypeSchema,
  bankAccountId: z.string().uuid(),
  safetyBufferFloor: z.string().nullable().optional(),
  monthlyAmount: z.string().nullable().optional(),
  enteredAmount: z.string().nullable().optional(),
  budgetFrequency: z.string().default("MONTHLY").optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  rrule: z.string().nullable().optional(),
  goalMode: GoalModeSchema.default("TARGET_DATE").optional(),
  targetAmount: z.string().nullable().optional(),
  isEssential: z.boolean().default(false),
  isCommitted: z.boolean().default(false),
  isSurplusTarget: z.boolean().default(false),
  isPrivate: z.boolean().default(false),
  userId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().int().default(0),
}).strict();

export type EnvelopeDtoType = z.infer<typeof EnvelopeSchema>;


export const EnvelopeListItemDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  envelopeType: EnvelopeTypeSchema,
  bankAccountId: z.string().uuid().nullable(),
  bankAccountName: z.string().nullable(),
  safetyBufferFloor: z.string().nullable(),
  monthlyAmount: z.string().nullable(),
  enteredAmount: z.string().nullable(),
  budgetFrequency: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  rrule: z.string().nullable(),
  goalMode: GoalModeSchema.nullable().optional(),
  targetAmount: z.string().nullable(),
  isEssential: z.boolean(),
  isCommitted: z.boolean(),
  isSurplusTarget: z.boolean(),
  isPrivate: z.boolean(),
  userId: z.string().nullable(),
  orderIndex: z.number().int(),
  createdAt: z.union([z.date(), z.string()]),
  currentBalance: z.number(),
  healthStatus: EnvelopeHealthStatusSchema,
  progressPercentage: z.number(),
  hasScheduledEvents: z.boolean(),
  generateEvents: z.boolean(),
}).strict();

export type EnvelopeListItemDto = z.infer<typeof EnvelopeListItemDtoSchema>;
