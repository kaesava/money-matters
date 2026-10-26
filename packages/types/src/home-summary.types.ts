import { z } from "zod";

export const HomeSummaryPaceStatusSchema = z.enum(["AHEAD", "ON_TRACK", "BEHIND", "CRITICAL", "AWAITING_FIRST_PAYDAY"]);
export type HomeSummaryPaceStatus = z.infer<typeof HomeSummaryPaceStatusSchema>;

export const HomeSummaryAttentionItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["EXPENSE", "TRANSFER"]),
  name: z.string(),
  expectedAmount: z.number(),
  expectedDate: z.string(),
  envelopeId: z.string().uuid().nullable(),
  envelopeName: z.string().nullable(),
  isOverdue: z.boolean(),
  currentBalance: z.number().optional(),
  sourcePoolId: z.string().uuid().optional(),
  sourcePoolName: z.string().optional(),
  destinationPoolId: z.string().uuid().optional(),
  destinationPoolName: z.string().optional(),
}).strict();
export type HomeSummaryAttentionItem = z.infer<typeof HomeSummaryAttentionItemSchema>;

export const HomeSummaryGoalItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  envelopeType: z.enum(["TARGET_GOAL", "ONGOING_GOAL"]),
  currentBalance: z.number(),
  targetAmount: z.number().nullable(),
  progressPercentage: z.number(),
  emoji: z.string().nullable().optional(),
  colorKey: z.string().nullable().optional(),
}).strict();
export type HomeSummaryGoalItem = z.infer<typeof HomeSummaryGoalItemSchema>;

export const HomeSummaryNextPaydaySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  expectedAmount: z.number(),
  expectedDate: z.string(),
  bankAccountId: z.string().uuid().nullable(),
  bankAccountName: z.string().nullable(),
  availableToBudget: z.number().nullable(),
}).strict();
export type HomeSummaryNextPayday = z.infer<typeof HomeSummaryNextPaydaySchema>;

export const HomeSummaryDtoSchema = z.object({
  safeToSpend: z.number(),
  safeToSpendCents: z.number().int(),
  daysToPayday: z.number().int(),
  dailyPace: z.number(),
  paceStatus: HomeSummaryPaceStatusSchema,
  everydayBalance: z.number(),
  everydayBudget: z.number(),
  everydaySafetyBuffer: z.number(),
  billsBalance: z.number(),
  billsBudget: z.number(),
  billsShortfall: z.number(),
  nextPayday: HomeSummaryNextPaydaySchema.nullable(),
  attentionItems: z.array(HomeSummaryAttentionItemSchema),
  goals: z.array(HomeSummaryGoalItemSchema),
  oldestBalanceMatchAt: z.string().nullable(),
  tenantCreatedAt: z.string().nullable(),
  hasConfirmedIncome: z.boolean(),
  isAwaitingFirstPayday: z.boolean(),
  todayDate: z.string(),
}).strict();

export type HomeSummaryDto = z.infer<typeof HomeSummaryDtoSchema>;
