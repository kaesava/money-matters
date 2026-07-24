import { z } from "zod";

// Base entity properties inherited by all tenant models
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

// Status Engine Core Types
export interface StatusStep {
  code: string;
  label: string;
  color: {
    web: {
      border: string;
      bg: string;
      text: string;
    };
    mobile: {
      bg: string;
      text: string;
    };
  };
}

export interface StatusWorkflowConfig {
  statuses: StatusStep[];
  transitions: Record<string, string[]>;
  defaultStatus: string;
}

// Default global status workflow presets (adapted from template)
export const DEFAULT_STATUS_WORKFLOW: StatusWorkflowConfig = {
  defaultStatus: 'New',
  statuses: [
    {
      code: 'New',
      label: 'New',
      color: {
        web: { border: 'border-t-slate-400', bg: 'bg-slate-50/50 text-slate-700', text: 'text-slate-700' },
        mobile: { bg: '#f1f5f9', text: '#475569' }
      }
    },
    {
      code: 'Active',
      label: 'Active',
      color: {
        web: { border: 'border-t-emerald-500', bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700' },
        mobile: { bg: '#dcfce7', text: '#15803d' }
      }
    },
    {
      code: 'Pending',
      label: 'Pending',
      color: {
        web: { border: 'border-t-amber-500', bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700' },
        mobile: { bg: '#fef9c3', text: '#a16207' }
      }
    },
    {
      code: 'Archived',
      label: 'Archived',
      color: {
        web: { border: 'border-t-slate-400', bg: 'bg-slate-100 text-slate-500', text: 'text-slate-500' },
        mobile: { bg: '#e2e8f0', text: '#64748b' }
      }
    }
  ],
  transitions: {
    New: ['Active', 'Archived'],
    Active: ['Pending', 'Archived'],
    Pending: ['Active', 'Archived'],
    Archived: ['Active']
  }
};

export function getStatusColor(
  status: string,
  platform: 'web',
  config?: StatusWorkflowConfig
): StatusStep['color']['web'];
export function getStatusColor(
  status: string,
  platform: 'mobile',
  config?: StatusWorkflowConfig
): StatusStep['color']['mobile'];
export function getStatusColor(
  status: string,
  platform: 'web' | 'mobile',
  config: StatusWorkflowConfig = DEFAULT_STATUS_WORKFLOW
): any {
  const step = config.statuses.find((s) => s.code.toLowerCase() === status.toLowerCase());
  const fallback = config.statuses[0];
  if (platform === 'web') {
    return step ? step.color.web : fallback.color.web;
  }
  return step ? step.color.mobile : fallback.color.mobile;
}

export function getNextStatuses(
  status: string,
  config: StatusWorkflowConfig = DEFAULT_STATUS_WORKFLOW
): string[] {
  const matchedKey = Object.keys(config.transitions).find(
    (k) => k.toLowerCase() === status.toLowerCase()
  );
  if (!matchedKey) return [];
  return config.transitions[matchedKey] || [];
}


// 1. Tenants
export const TenantSchema = BaseSchema.extend({
  name: z.string().min(1),
  fyEndMonthDay: z.string().regex(/^\d{2}-\d{2}$/).default("06-30"),
  premiumEnabled: z.boolean().default(false),
}).strict();

export const CreateTenantCommand = z.object({
  name: z.string().min(1),
  // userId is intentionally absent — derived server-side from the verified JWT (ctx.userId)
}).strict();

export const UpdateTenantCommand = z.object({
  name: z.string().min(1).optional(),
  fyEndMonthDay: z.string().regex(/^\d{2}-\d{2}$/).optional(),
}).strict();

// 2. Tenant Members
export const TenantMemberSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["OWNER", "MEMBER"]),
  inviteToken: z.string().uuid().nullable(),
  inviteStatus: z.enum(["PENDING", "ACCEPTED", "REVOKED"]),
}).strict();

// 3. Bank Accounts
export const BankAccountSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  lastKnownBalance: z.string().default("0.00"),
  unbudgetedBuffer: z.string().default("0.00"),
}).strict();

export const CreateBankAccountCommand = z.object({
  name: z.string().min(1),
  lastKnownBalance: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0.00").optional(),
  unbudgetedBuffer: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0.00").optional(),
}).strict();

export const UpdateBankAccountCommand = z.object({
  name: z.string().min(1).optional(),
  lastKnownBalance: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  unbudgetedBuffer: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
}).strict();

// 4. Categories
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

export const CreateCategoryCommand = z.object({
  name: z.string().min(1),
  type: z.enum(["REGULAR", "GOAL", "EVERYDAY"]),
  isCommitted: z.boolean().default(false).optional(),
  monthlyAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  budgetFrequency: z.enum(["FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  targetDate: z.string().optional(),
  isDefaultExcess: z.boolean().default(false).optional(),
  rolloverRule: z.enum(["ROLLOVER", "SWEEP", "RESET"]).optional(),
  isDefaultSavings: z.boolean().optional(),
  everydayTargetKeepAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  everydaySweepFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]).optional(),
  icon: z.string().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bankAccountId: z.string().uuid().optional(),
}).strict();

export const UpdateCategoryCommand = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["REGULAR", "GOAL", "EVERYDAY"]).optional(),
  isCommitted: z.boolean().optional(),
  monthlyAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  budgetFrequency: z.enum(["FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  targetDate: z.string().optional(),
  isDefaultExcess: z.boolean().optional(),
  rolloverRule: z.enum(["ROLLOVER", "SWEEP", "RESET"]).optional(),
  isDefaultSavings: z.boolean().optional(),
  everydayTargetKeepAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  everydaySweepFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]).optional(),
  icon: z.string().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bankAccountId: z.string().uuid().optional(),
}).strict();

// 5. Category Schedules
export const CategoryScheduleSchema = BaseSchema.extend({
  categoryId: z.string().uuid(),
  targetAmount: z.string(),
  dueDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  rrule: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
}).strict();

export const CreateCategoryScheduleCommand = z.object({
  categoryId: z.string().uuid(),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  targetDate: z.string().optional(),
  dueDate: z.string().optional(),
  rrule: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).strict();

// 6. Income Sources
export const IncomeSourceSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["SALARY", "WAGES", "FREELANCE", "OTHER"]),
  amount: z.string(),
  receivingAccountId: z.string().uuid().nullable(),
}).strict();

export const CreateIncomeSourceCommand = z.object({
  name: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  receivingAccountId: z.string().uuid().optional(),
}).strict();

export const UpdateIncomeSourceCommand = z.object({
  name: z.string().min(1).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  receivingAccountId: z.string().uuid().optional(),
}).strict();

// 7. Income Source Schedules
export const IncomeSourceScheduleSchema = BaseSchema.extend({
  incomeSourceId: z.string().uuid(),
  rrule: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  occurrenceCount: z.number().int().nullable(),
  nextOccurrenceDate: z.string().nullable(),
}).strict();

export const CreateIncomeSourceScheduleCommand = z.object({
  incomeSourceId: z.string().uuid(),
  rrule: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  occurrenceCount: z.number().int().optional(),
}).strict();

// 8. Income Events
export const IncomeEventSchema = BaseSchema.extend({
  incomeSourceId: z.string().uuid(),
  expectedDate: z.string(),
  expectedAmount: z.string(),
  actualAmount: z.string().nullable(),
  status: z.enum(["UPCOMING", "PENDING", "CONFIRMED"]),
}).strict();

export const CreateIncomeEventCommand = z.object({
  incomeSourceId: z.string().uuid(),
  expectedDate: z.string(),
  expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).strict();

// 9. Allocation Plans
export const AllocationPlanSchema = BaseSchema.extend({
  incomeEventId: z.string().uuid(),
  status: z.enum(["PENDING", "CONFIRMED"]),
  totalIncomeAmount: z.string(),
  confirmedAt: z.date().nullable(),
}).strict();

// 10. Allocation Plan Lines
export const AllocationPlanLineSchema = BaseSchema.extend({
  planId: z.string().uuid(),
  categoryId: z.string().uuid(),
  proposedAmount: z.string(),
  confirmedAmount: z.string().nullable(),
  reasoning: z.string().nullable(),
}).strict();

// 11. Transaction Ledger
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

export const RecordExpenseCommand = z.object({
  categoryId: z.string().uuid(),
  bankAccountId: z.string().uuid().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  flowType: z.enum(["DEBIT", "CREDIT"]).optional().default("DEBIT"),
  date: z.string().optional(),
  recordedAt: z.string().optional(),
  idempotencyKey: z.string().optional(),
  note: z.string().optional(),
  source: z.enum(["MANUAL", "AUTO", "IMPORT"]).optional().default("MANUAL"),
  transferGroupId: z.string().uuid().optional(),
}).strict();

export const ListTransactionsQuery = z.object({
  limit: z.number().int().max(100).default(50),
  offset: z.number().int().default(0),
  categoryId: z.string().uuid().optional(),
}).strict();

export const ListCategoryTransactionsQuery = z.object({
  categoryId: z.string().uuid(),
  limit: z.number().int().max(100).default(30),
  offset: z.number().int().default(0),
}).strict();

// 12. "Can We Afford This?" schemas
export const CanAffordQuery = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).strict();

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

export const MonthlySummaryDto = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  totalIncome: z.string(),
  totalSpent: z.string(),
  totalSaved: z.string(),
  everydayRemaining: z.string(),
}).strict();

export const ConfirmPlanCommand = z.object({
  planId: z.string().uuid(),
  lines: z.array(z.object({
    lineId: z.string().uuid(),
    confirmedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  }).strict())
}).strict();

export const MoveMoneyCommand = z.object({
  sourceCategoryId: z.string().uuid(),
  destinationCategoryId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).strict();

export const UserPreferencesSchema = z.object({
  quickActionsCollapsed: z.boolean().default(false),
  timezone: z.string().default("UTC"),
}).strict();

export const UpdateUserPreferencesCommand = z.object({
  quickActionsCollapsed: z.boolean().optional(),
  timezone: z.string().optional(),
}).strict();

export const OverrideEventCommand = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum(["INCOME", "EXPENSE"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  expectedDate: z.string(),
  updateSeries: z.boolean().default(false),
}).strict();

export const SkipEventsCommand = z.object({
  eventIds: z.array(z.string().uuid()).min(1),
  eventType: z.enum(["INCOME", "EXPENSE"]),
}).strict();

export const ConfirmPaydayCommand = z.object({
  incomeEventId: z.string().uuid(),
  actualAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  lines: z.array(
    z.object({
      bucketId: z.string().uuid(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    }).strict()
  ),
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
export type MoveMoneyType = z.infer<typeof MoveMoneyCommand>;


