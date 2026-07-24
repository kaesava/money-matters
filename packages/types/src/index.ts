/**
 * Monorepo Domain Schemas & Validation Contracts
 * 
 * Provides runtime validation using Zod for base entities, tenant-scoped domain structures,
 * bank accounts, categories, income sources, payday allocation plans, and affordability queries.
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

/**
 * Schema validating Tenant organisation details including fiscal year parameters and premium feature flags.
 */
export const TenantSchema = BaseSchema.extend({
  name: z.string().min(1),
  fyEndMonthDay: z.string().regex(/^\d{2}-\d{2}$/).default("06-30"),
  premiumEnabled: z.boolean().default(false),
}).strict();

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
  lastKnownBalance: z.string().default("0.00"),
  unbudgetedBuffer: z.string().default("0.00"),
}).strict();

/**
 * Schema defining spending and savings categories across the 3-bucket architecture (REGULAR, GOAL, EVERYDAY).
 */
export const CategorySchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["REGULAR", "GOAL", "EVERYDAY"]),
  isCommitted: z.boolean().default(false),
  monthlyAmount: z.string().nullable(),
  budgetFrequency: z.enum(["FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).default("MONTHLY"),
  isDefaultExcess: z.boolean().default(false),
  rolloverRule: z.enum(["ROLLOVER", "SWEEP", "RESET"]).default("ROLLOVER"),
  isDefaultSavings: z.boolean().default(false),
  everydayTargetKeepAmount: z.string().nullable(),
  everydaySweepFrequency: z.string().nullable(),
  icon: z.string().nullable(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  bankAccountId: z.string().uuid().nullable(),
}).strict();

/**
 * Schema for category recurring target dates, due dates, and schedule parameters.
 */
export const CategoryScheduleSchema = BaseSchema.extend({
  categoryId: z.string().uuid(),
  targetAmount: z.string(),
  dueDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  rrule: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
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
  incomeSourceId: z.string().uuid(),
  expectedDate: z.string(),
  expectedAmount: z.string(),
  actualAmount: z.string().nullable(),
  status: z.enum(["UPCOMING", "PENDING", "CONFIRMED"]),
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
 * Schema for individual category line-items within a paycheck allocation plan.
 */
export const AllocationPlanLineSchema = BaseSchema.extend({
  planId: z.string().uuid(),
  categoryId: z.string().uuid(),
  proposedAmount: z.string(),
  confirmedAmount: z.string().nullable(),
  reasoning: z.string().nullable(),
}).strict();

/**
 * Schema for double-entry or single-entry transaction ledger events.
 */
export const TransactionLedgerSchema = BaseSchema.extend({
  categoryId: z.string().uuid(),
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
  limit: z.number().int().max(100).default(50),
  offset: z.number().int().default(0),
  categoryId: z.string().uuid().optional(),
}).strict();

/**
 * Query schema for listing transactions scoped to a specific category.
 */
export const ListCategoryTransactionsQuery = z.object({
  categoryId: z.string().uuid(),
  limit: z.number().int().max(100).default(30),
  offset: z.number().int().default(0),
}).strict();

/**
 * Input query schema for checking expense affordability ("Can We Afford This?").
 */
export const CanAffordQuery = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).strict();

/**
 * Discriminated union DTO defining potential affordability decision outcomes.
 */
export const CanAffordVerdictDto = z.discriminatedUnion("verdict", [
  z.object({
    verdict: z.literal("YES"),
    source: z.literal("everyday"),
    everydayRemaining: z.string(),
  }),
  z.object({
    verdict: z.literal("YES_WITH_IMPACT"),
    source: z.literal("savings"),
    affectedBucketName: z.string(),
    affectedBucketId: z.string(),
    newBalance: z.string(),
  }),
  z.object({
    verdict: z.literal("WAIT"),
    daysUntilNextPaycheck: z.number().int(),
    amountExpected: z.string(),
  }),
  z.object({
    verdict: z.literal("NO"),
    shortfall: z.string(),
  }),
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
}).strict();

export type TenantType = z.infer<typeof TenantSchema>;
export type TenantMemberType = z.infer<typeof TenantMemberSchema>;
export type BankAccountType = z.infer<typeof BankAccountSchema>;
export type CategoryType = z.infer<typeof CategorySchema>;
export type CategoryScheduleType = z.infer<typeof CategoryScheduleSchema>;
export type IncomeSourceType = z.infer<typeof IncomeSourceSchema>;
export type IncomeSourceScheduleType = z.infer<typeof IncomeSourceScheduleSchema>;
export type IncomeEventType = z.infer<typeof IncomeEventSchema>;
export type AllocationPlanType = z.infer<typeof AllocationPlanSchema>;
export type AllocationPlanLineType = z.infer<typeof AllocationPlanLineSchema>;
export type TransactionLedgerType = z.infer<typeof TransactionLedgerSchema>;
export type CanAffordVerdictType = z.infer<typeof CanAffordVerdictDto>;
export type MonthlySummaryType = z.infer<typeof MonthlySummaryDto>;

