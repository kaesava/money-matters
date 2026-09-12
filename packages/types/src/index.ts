/* eslint-disable no-redeclare */
/**
 * Monorepo Domain Schemas & Validation Contracts
 * 
 * Provides runtime validation using Zod for base entities, tenant-scoped domain structures,
 * bank accounts, pools, categories, income sources, payday allocation plans, and affordability queries.
 */
import { z } from "zod";

/**
 * Base audit schema inherited by all tenant-scoped database models.
 * Ensures metadata fields (IDs, audit timestamps, creator/updater user IDs) conform to strict UUID and Date types.
 */
export const BaseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  appId: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid(),
  updatedAt: z.date(),
  updatedBy: z.string().uuid(),
  archivedAt: z.date().nullable(),
}).strict();

export * from "./status.types.js";
export * from "./commands.types.js";
export * from "./setup-presets.js";
export * from "./app-preferences.js";
export * from "./onboarding-quiz.js";
export * from "./locale.types.js";

/**
 * Subscription status lifecycle state machine.
 */
export const SubscriptionStatus = z.enum([
  "TRIAL_ACTIVE",
  "TRIAL_GRACE",
  "TRIAL_EXPIRED",
  "SUBSCRIBED",
  "PAST_DUE",
  "DEACTIVATED",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

/**
 * Schema validating Tenant organisation details including fiscal year parameters and subscription lifecycle.
 */
export const TenantSchema = BaseSchema.extend({
  name: z.string().min(1),
  country: z.string().length(2).default("AU"),
  currency: z.string().length(3).default("AUD"),
  timezone: z.string().default("Australia/Sydney"),
  fyEndMonthDay: z.string().regex(/^\d{2}-\d{2}$/).default("06-30"),
  premiumEnabled: z.boolean().default(false),
  subscriptionStatus: SubscriptionStatus.default("TRIAL_ACTIVE"),
  trialStartedAt: z.date().nullable().default(null),
  trialEndsAt: z.date().nullable().default(null),
  trialGraceEndsAt: z.date().nullable().default(null),
  stripeCustomerId: z.string().nullable().default(null),
  stripeSubscriptionId: z.string().nullable().default(null),
  stripePriceId: z.string().nullable().default(null),
  subscribedAt: z.date().nullable().default(null),
  subscriptionEndsAt: z.date().nullable().default(null),
}).strict();

/**
 * DTO summarizing tenant subscription status and trial lifecycle flags.
 */
export const SubscriptionStatusDto = z.object({
  status: SubscriptionStatus,
  trialEndsAt: z.date().nullable(),
  trialGraceEndsAt: z.date().nullable(),
  subscriptionEndsAt: z.date().nullable(),
  isTrialActive: z.boolean(),
  isTrialGrace: z.boolean(),
  isTrialExpired: z.boolean(),
  isSubscribed: z.boolean(),
  isPastDue: z.boolean(),
  isDeactivated: z.boolean(),
  daysRemainingInTrial: z.number().nullable(),
  cancelAtPeriodEnd: z.boolean().default(false),
  planType: z.enum(["monthly", "annual", "founding"]).nullable().optional(),
  nextBillingAt: z.date().nullable().optional(),
}).strict();
export type SubscriptionStatusDto = z.infer<typeof SubscriptionStatusDto>;

/**
 * Schema validating tenant membership access control, role levels, and pending invite tokens.
 */
export const TenantMemberSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["OWNER", "MEMBER"]),
  inviteToken: z.string().uuid().nullable(),
  inviteStatus: z.enum(["PENDING", "ACCEPTED", "REVOKED"]),
}).strict();

/**
 * Schema validating financial bank account tracking entities within a tenant partition.
 */
export const BankAccountSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  bankProvider: z.string().default("CBA"),
  lastKnownBalance: z.string().default("0.00"),
  unbudgetedBuffer: z.string().default("0.00"),
  isPrivate: z.boolean().default(false),
  userId: z.string().uuid().nullable().optional(),
}).strict();

/**
 * Schema defining Virtual Pools (EVERYDAY, REGULAR, GOAL) linked to Bank Accounts.
 */
export const PoolSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  poolType: z.enum(["EVERYDAY", "REGULAR", "GOAL"]),
  bankAccountId: z.string().uuid(),
  everydayAllowanceAmount: z.string().nullable().optional(),
  rolloverRule: z.enum(["ROLLOVER", "SWEEP", "RESET"]).default("ROLLOVER").optional(),
  targetAmount: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  isCommitted: z.boolean().default(false),
  isSurplusTarget: z.boolean().default(false),
  waterfallPriority: z.number().int().default(50),
}).strict();

/**
 * Schema defining spending sub-categories belonging to a Pool.
 */
export const CategorySchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  poolId: z.string().uuid(),
  name: z.string().min(1),
  monthlyAmount: z.string().nullable().optional(),
  enteredAmount: z.string().nullable().optional(),
  budgetFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).default("MONTHLY").optional(),
  isEssential: z.boolean().default(false),
  icon: z.string().nullable().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  lastNotifiedAt: z.date().nullable().optional(),
}).strict();

/**
 * Schema defining income sources (e.g. Salary, Wages, Freelance) linked to receiving accounts.
 */
export const IncomeSourceSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["SALARY", "WAGES", "FREELANCE", "OTHER"]),
  amount: z.string(),
  receivingAccountId: z.string().uuid().nullable(),
}).strict();

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

/**
 * Schema for concrete expected or confirmed income pay events.
 */
export const IncomeEventSchema = BaseSchema.extend({
  incomeSourceId: z.string().uuid().nullable().optional(),
  name: z.string().nullable().optional(),
  expectedDate: z.string(),
  expectedAmount: z.string(),
  actualAmount: z.string().nullable(),
  status: z.enum(["PENDING", "PENDING", "SKIPPED", "CONFIRMED"]),
}).strict();

/**
 * Schema defining paycheck cascade allocation plans generated for income events.
 */
export const AllocationPlanSchema = BaseSchema.extend({
  incomeEventId: z.string().uuid(),
  status: z.enum(["PENDING", "CONFIRMED"]),
  totalIncomeAmount: z.string(),
  confirmedAt: z.date().nullable(),
}).strict();


/**
 * Schema for individual pool line-items within a paycheck allocation plan.
 */
export const AllocationPlanLineSchema = BaseSchema.extend({
  planId: z.string().uuid(),
  poolId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  proposedAmount: z.string(),
  confirmedAmount: z.string().nullable(),
  reasoning: z.string().nullable(),
}).strict();

/**
 * Schema for double-entry or single-entry transaction ledger events.
 */
export const TransactionLedgerSchema = BaseSchema.extend({
  poolId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  bankAccountId: z.string().uuid().nullable(),
  planLineId: z.string().uuid().nullable(),
  transferGroupId: z.string().uuid().nullable().optional(),
  flowType: z.enum(["DEBIT", "CREDIT"]),
  amount: z.string(),
  idempotencyKey: z.string(),
  note: z.string().nullable(),
  source: z.enum(["MANUAL", "AUTO", "IMPORT"]).default("MANUAL"),
  recordedAt: z.date(),
}).strict();

/**
 * Query schema for listing transaction ledger entries with pagination.
 */
export const ListTransactionsQuery = z.object({
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().default(0),
  poolId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
}).strict();

/**
 * Query schema for listing transactions scoped to a specific pool or category.
 */
export const ListCategoryTransactionsQuery = z.object({
  poolId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  limit: z.number().int().max(100).default(30),
  offset: z.number().int().default(0),
}).strict();

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
  isCommitted: z.boolean(),
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

/**
 * DTO summarizing monthly income, spending, savings, and remaining everyday cash balance.
 */
export const MonthlySummaryDto = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  totalIncome: z.string(),
  totalSpent: z.string(),
  totalSaved: z.string(),
  everydayRemaining: z.string(),
}).strict();

/**
 * Bill coverage item and overall result schemas.
 */
export const BillCoverageItemSchema = z.object({
  poolId: z.string(),
  poolName: z.string(),
  categoryId: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  monthlyAmount: z.string().nullable(),
  nextDueDate: z.string().nullable(),
  nextDueAmount: z.string().nullable(),
  coverageStatus: z.enum(["COVERED", "SHORT_BY", "NO_SCHEDULE"]),
  shortfallAmount: z.string().nullable(),
}).strict();

export const BillCoverageResultSchema = z.object({
  billsPoolBalance: z.number(),
  totalUpcomingBeforePayday: z.number(),
  nextPaydayDate: z.string().nullable(),
  items: z.array(BillCoverageItemSchema),
}).strict();

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

/**
 * Schema for tenant member UI preferences and localization settings.
 */
export const UserPreferencesSchema = z.object({
  quickActionsCollapsed: z.boolean().default(false),
  timezone: z.string().default("UTC"),
  language: z.enum(["en", "ja"]).default("en"),
  locale: z.string().default("auto"),
}).strict();

export type TenantType = z.infer<typeof TenantSchema>;
export type TenantMemberType = z.infer<typeof TenantMemberSchema>;
export type BankAccountType = z.infer<typeof BankAccountSchema>;
export type PoolType = z.infer<typeof PoolSchema>;
export type CategoryType = z.infer<typeof CategorySchema>;
export type IncomeSourceType = z.infer<typeof IncomeSourceSchema>;
export type IncomeSourceScheduleType = z.infer<typeof IncomeSourceScheduleSchema>;
export type IncomeEventType = z.infer<typeof IncomeEventSchema>;
export type AllocationPlanType = z.infer<typeof AllocationPlanSchema>;
export type AllocationPlanLineType = z.infer<typeof AllocationPlanLineSchema>;
export type TransactionLedgerType = z.infer<typeof TransactionLedgerSchema>;
export type CanAffordVerdictType = z.infer<typeof CanAffordVerdictDto>;
export type MonthlySummaryType = z.infer<typeof MonthlySummaryDto>;
export type BillCoverageItem = z.infer<typeof BillCoverageItemSchema>;
export type BillCoverageResult = z.infer<typeof BillCoverageResultSchema>;

/**
 * Application Version and Diagnostics DTO
 */
export const AppVersionInfoSchema = z.object({
  appId: z.string().uuid(),
  appName: z.string().min(1),
  version: z.string().min(1),
  buildNumber: z.string().min(1),
  channel: z.enum(["development", "preview", "beta", "production"]),
  gitCommit: z.string().min(1),
  platform: z.enum(["web", "ios", "android"]),
  formattedVersion: z.string().min(1),
}).strict();

export type AppVersionInfo = z.infer<typeof AppVersionInfoSchema>;
