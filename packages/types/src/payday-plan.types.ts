import { z } from "zod";
import { BaseSchema } from "./tenant.types.js";

/**
 * Schema defining income sources (e.g. Salary, Wages, Freelance) linked to receiving accounts.
 */
export const IncomeTypeEnum = z.enum(["SALARIED", "IRREGULAR"]);
export type IncomeType = z.infer<typeof IncomeTypeEnum>;

export const IncomeContributionModeEnum = z.enum(["FULL", "PERCENTAGE", "FIXED_AMOUNT"]);
export type IncomeContributionMode = z.infer<typeof IncomeContributionModeEnum>;

export const IncomeSourceSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  incomeType: IncomeTypeEnum.default("SALARIED"),
  amount: z.string(),
  receivingAccountId: z.string().uuid().nullable(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  rrule: z.string().nullable().optional(),
  contributionMode: IncomeContributionModeEnum.default("FULL"),
  contributionValue: z.string().nullable().optional(),
}).strict();
export type IncomeSourceType = z.infer<typeof IncomeSourceSchema>;

/**
 * Schema for income source recurrence schedules and expected next pay dates.
 */
export const IncomeSourceScheduleSchema = BaseSchema.extend({
  incomeSourceId: z.string().uuid(),
  rrule: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  occurrenceCount: z.number().int().nullable(),
  nextOccurrenceDate: z.string().nullable(),
}).strict();
export type IncomeSourceScheduleType = z.infer<typeof IncomeSourceScheduleSchema>;

/**
 * Schema for concrete expected or confirmed income pay events.
 */
export const IncomeEventSchema = BaseSchema.extend({
  incomeSourceId: z.string().uuid().nullable().optional(),
  name: z.string().nullable().optional(),
  expectedDate: z.string(),
  expectedAmount: z.string(),
  actualAmount: z.string().nullable(),
  contributionMode: IncomeContributionModeEnum.default("FULL").optional(),
  contributionValue: z.string().nullable().optional(),
  status: z.enum(["PENDING", "SKIPPED", "CONFIRMED"]),
}).strict();
export type IncomeEventType = z.infer<typeof IncomeEventSchema>;

/**
 * Schema defining paycheck cascade allocation plans generated for income events.
 */
export const AllocationPlanSchema = BaseSchema.extend({
  incomeEventId: z.string().uuid(),
  status: z.enum(["PENDING", "CONFIRMED"]),
  totalIncomeAmount: z.string(),
  confirmedAt: z.date().nullable(),
}).strict();
export type AllocationPlanType = z.infer<typeof AllocationPlanSchema>;

/**
 * Schema for individual envelope line-items within a paycheck allocation plan.
 */
export const AllocationPlanLineSchema = BaseSchema.extend({
  planId: z.string().uuid(),
  envelopeId: z.string().uuid(),
  proposedAmount: z.string(),
  confirmedAmount: z.string().nullable(),
  reasoning: z.string().nullable(),
}).strict();
export type AllocationPlanLineType = z.infer<typeof AllocationPlanLineSchema>;

/**
 * Command schema to finalize and confirm a paycheck allocation plan.
 */
export const ConfirmPlanCommand = z.object({
  planId: z.string().uuid(),
  lines: z.array(z.object({
    lineId: z.string().uuid(),
    confirmedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  }).strict())
}).strict();
