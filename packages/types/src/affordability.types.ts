import { z } from "zod";

/**
 * Sub-schema for an upcoming bill item shown in affordability simulation breakdowns.
 */
export const UpcomingBillItemSchema = z.object({
  name: z.string(),
  amount: z.string(),
  dueDate: z.string(),
}).strict();
export type UpcomingBillItem = z.infer<typeof UpcomingBillItemSchema>;

/**
 * Sub-schema describing how a goal's target date is impacted by a purchase or recurring commitment.
 */
export const GoalDelayImpactSchema = z.object({
  goalId: z.string().uuid(),
  goalName: z.string(),
  isPriority: z.boolean().default(false).optional(),
  originalTargetDate: z.string().nullable(),
  newTargetDate: z.string().nullable(),
  delayDays: z.number().int(),
}).strict();
export type GoalDelayImpact = z.infer<typeof GoalDelayImpactSchema>;

export const OneOffGoalAlternativeSchema = z.object({
  goalId: z.string().uuid(),
  goalName: z.string(),
  availableGoalBalance: z.string(),
  shortfallCovered: z.string(),
  delayDays: z.number().int(),
  newTargetDate: z.string().nullable(),
}).strict();
export type OneOffGoalAlternative = z.infer<typeof OneOffGoalAlternativeSchema>;

/**
 * Input query schema for the "Can I Afford It?" simulation.
 * Supports one-off purchases and recurring commitments with frequency.
 */
export const CanAffordQuery = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => parseFloat(v) > 0, { message: "Amount must be greater than 0" }),
  mode: z.enum(["ONE_OFF", "RECURRING"]).default("ONE_OFF"),
  frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  includePersonal: z.boolean().default(false).optional(),
  itemName: z.string().max(100).optional(),
}).strict();

/**
 * Discriminated union DTO defining all affordability simulation outcomes.
 * Produced by the simulation capability's canAffordSimulationQuery.
 */
export const CanAffordVerdictDto = z.discriminatedUnion("verdict", [
  // SAFE_YES: affordable now, comfortable safe cushion
  z.object({
    verdict: z.literal("SAFE_YES"),
    availableCash: z.string(),
    effectiveSpendable: z.string(),
    everydayRemaining: z.string(),
    safeCushion: z.string(),
    daysUntilPayday: z.number().int(),
    nextPaydayDate: z.string(),
    upcomingBillsBeforePayday: z.string(),
    startAdvice: z.string().optional(),
    rationaleSteps: z.array(z.string()),
  }).strict(),

  // PACING_TIGHT: affordable now, but below recommended safe cushion
  z.object({
    verdict: z.literal("PACING_TIGHT"),
    availableCash: z.string(),
    effectiveSpendable: z.string(),
    everydayRemaining: z.string(),
    safeCushion: z.string(),
    cushionShortfall: z.string(),
    daysUntilPayday: z.number().int(),
    nextPaydayDate: z.string(),
    upcomingBillsBeforePayday: z.string(),
    startAdvice: z.string().optional(),
    rationaleSteps: z.array(z.string()),
  }).strict(),

  // BILLS_RISK: balance sufficient but upcoming bills eat the buffer
  z.object({
    verdict: z.literal("BILLS_RISK"),
    availableCash: z.string(),
    upcomingBillsBeforePayday: z.string(),
    effectiveAfterBills: z.string(),
    billsDueItems: z.array(UpcomingBillItemSchema),
    rationaleSteps: z.array(z.string()),
  }).strict(),

  // WAIT_FOR_PAYCYCLE: find earliest income event step where Everyday covers amount
  z.object({
    verdict: z.literal("WAIT_FOR_PAYCYCLE"),
    canAffordAt: z.string(),
    paycyclesAway: z.number().int(),
    projectedEverydayAtThatDate: z.string(),
    shortfallToday: z.string(),
    goalAlternative: OneOffGoalAlternativeSchema.optional(),
    rationaleSteps: z.array(z.string()),
  }).strict(),

  // GOAL_DELAYED: recurring commitment delays one or more goals
  z.object({
    verdict: z.literal("GOAL_DELAYED"),
    isAffordable: z.boolean(),
    goalDelays: z.array(GoalDelayImpactSchema),
    recurringMonthlyImpact: z.string(),
    startAdvice: z.string().optional(),
    rationaleSteps: z.array(z.string()),
  }).strict(),

  // HARD_NO: 12-month projection exhausted, no affordable paycycle found
  z.object({
    verdict: z.literal("HARD_NO"),
    shortfall: z.string(),
    horizonMonths: z.number().int(),
    rationaleSteps: z.array(z.string()),
  }).strict(),
]);

export type CanAffordVerdictType = z.infer<typeof CanAffordVerdictDto>;

/**
 * Bill coverage item and overall result schemas.
 */
export const BillCoverageItemSchema = z.object({
  envelopeId: z.string(),
  envelopeName: z.string(),
  monthlyAmount: z.string().nullable(),
  nextDueDate: z.string().nullable(),
  nextDueAmount: z.string().nullable(),
  coverageStatus: z.enum(["COVERED", "SHORT_BY", "NO_SCHEDULE"]),
  shortfallAmount: z.string().nullable(),
}).strict();

export type BillCoverageItem = z.infer<typeof BillCoverageItemSchema>;

export const BillCoverageResultSchema = z.object({
  billsPoolBalance: z.number(),
  totalUpcomingBeforePayday: z.number(),
  nextPaydayDate: z.string().nullable(),
  items: z.array(BillCoverageItemSchema),
}).strict();

export type BillCoverageResult = z.infer<typeof BillCoverageResultSchema>;
