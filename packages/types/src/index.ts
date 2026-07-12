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


// 1. Households
export const HouseholdSchema = BaseSchema.extend({
  name: z.string().min(1),
  fyEndMonthDay: z.string().regex(/^\d{2}-\d{2}$/).default("06-30"),
  premiumEnabled: z.boolean().default(false),
}).strict();

export const CreateHouseholdCommand = z.object({
  name: z.string().min(1),
  userId: z.string().uuid(),
}).strict();

export const UpdateHouseholdCommand = z.object({
  name: z.string().min(1).optional(),
  fyEndMonthDay: z.string().regex(/^\d{2}-\d{2}$/).optional(),
}).strict();

// 2. Household Members
export const HouseholdMemberSchema = BaseSchema.extend({
  householdId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["OWNER", "MEMBER"]),
  inviteToken: z.string().uuid().nullable(),
  inviteStatus: z.enum(["PENDING", "ACCEPTED", "REVOKED"]),
}).strict();

// 3. Bank Accounts
export const BankAccountSchema = BaseSchema.extend({
  householdId: z.string().uuid(),
  name: z.string().min(1),
  purpose: z.array(z.enum(["INCOME_LANDING", "SAVINGS", "EVERYDAY"])).min(1),
  lastKnownBalance: z.string().default("0.00"),
  isOffset: z.boolean().default(false),
}).strict();

export const CreateBankAccountCommand = z.object({
  name: z.string().min(1),
  purpose: z.array(z.enum(["INCOME_LANDING", "SAVINGS", "EVERYDAY"])).min(1),
  lastKnownBalance: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0.00"),
  isOffset: z.boolean().default(false),
}).strict();

export const UpdateBankAccountCommand = z.object({
  name: z.string().min(1).optional(),
  purpose: z.array(z.enum(["INCOME_LANDING", "SAVINGS", "EVERYDAY"])).min(1).optional(),
  lastKnownBalance: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  isOffset: z.boolean().optional(),
}).strict();

// 4. Categories
export const CategorySchema = BaseSchema.extend({
  householdId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["MAJOR", "RECURRING", "EVERYDAY"]),
  priorityRank: z.number().int().min(1).nullable(),
  isDefaultExcess: z.boolean().default(false),
  icon: z.string().nullable(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  bankAccountId: z.string().uuid().nullable(),
}).strict();

export const CreateCategoryCommand = z.object({
  name: z.string().min(1),
  type: z.enum(["MAJOR", "RECURRING", "EVERYDAY"]),
  priorityRank: z.number().int().min(1).optional(),
  isDefaultExcess: z.boolean().default(false),
  icon: z.string().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}).strict();

export const UpdateCategoryCommand = z.object({
  name: z.string().min(1).optional(),
  priorityRank: z.number().int().min(1).optional(),
  isDefaultExcess: z.boolean().optional(),
  icon: z.string().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bankAccountId: z.string().uuid().optional(),
}).strict();

// 5. Category Schedules
export const CategoryScheduleSchema = BaseSchema.extend({
  categoryId: z.string().uuid(),
  targetAmount: z.string(),
  rrule: z.string().nullable(),
  dueDate: z.string().nullable(),
  nextDueDate: z.string().nullable(),
}).strict();

export const CreateCategoryScheduleCommand = z.object({
  categoryId: z.string().uuid(),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  rrule: z.string().optional(),
  dueDate: z.string().optional(),
}).strict();

// 6. Income Sources
export const IncomeSourceSchema = BaseSchema.extend({
  householdId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["SALARY", "FREELANCE", "OTHER"]),
  amount: z.string(),
  receivingAccountId: z.string().uuid().nullable(),
}).strict();

export const CreateIncomeSourceCommand = z.object({
  name: z.string().min(1),
  type: z.enum(["SALARY", "FREELANCE", "OTHER"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
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
  status: z.enum(["UPCOMING", "DRAFT", "REVIEWED", "CONFIRMED"]),
}).strict();

export const CreateIncomeEventCommand = z.object({
  incomeSourceId: z.string().uuid(),
  expectedDate: z.string(),
  expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).strict();

// 9. Allocation Plans
export const AllocationPlanSchema = BaseSchema.extend({
  incomeEventId: z.string().uuid(),
  status: z.enum(["DRAFT", "REVIEWED", "CONFIRMED"]),
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
  isShortfallRepayment: z.boolean().default(false),
}).strict();

// 11. Transaction Ledger
export const TransactionLedgerSchema = BaseSchema.extend({
  categoryId: z.string().uuid(),
  bankAccountId: z.string().uuid().nullable(),
  planLineId: z.string().uuid().nullable(),
  flowType: z.enum(["DEBIT", "CREDIT"]),
  amount: z.string(),
  idempotencyKey: z.string(),
  note: z.string().nullable(),
  recordedAt: z.date(),
}).strict();

export const RecordExpenseCommand = z.object({
  categoryId: z.string().uuid(),
  bankAccountId: z.string().uuid().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  idempotencyKey: z.string(),
  note: z.string().optional(),
}).strict();

// 12. Shortfall Events
export const ShortfallEventSchema = BaseSchema.extend({
  donorCategoryId: z.string().uuid(),
  recipientCategoryId: z.string().uuid(),
  borrowedAmount: z.string(),
  repaidAmount: z.string().default("0.00"),
  status: z.enum(["BORROWED", "PARTIAL", "REPAID"]),
}).strict();

// 13. Savings Reconciliations
export const SavingsReconciliationSchema = BaseSchema.extend({
  bankAccountId: z.string().uuid(),
  expectedBalance: z.string(),
  actualBalance: z.string(),
  delta: z.string(),
  reconciledAt: z.date(),
}).strict();

export const SubmitReconciliationCommand = z.object({
  bankAccountId: z.string().uuid(),
  actualBalance: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).strict();

export const ConfirmPlanCommand = z.object({
  planId: z.string().uuid(),
  lines: z.array(z.object({
    lineId: z.string().uuid(),
    confirmedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  }).strict())
}).strict();

export const ResolveShortfallCommand = z.object({
  donorCategoryId: z.string().uuid(),
  recipientCategoryId: z.string().uuid(),
  borrowedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).strict();

export type HouseholdType = z.infer<typeof HouseholdSchema>;
export type HouseholdMemberType = z.infer<typeof HouseholdMemberSchema>;
export type BankAccountType = z.infer<typeof BankAccountSchema>;
export type CategoryType = z.infer<typeof CategorySchema>;
export type CategoryScheduleType = z.infer<typeof CategoryScheduleSchema>;
export type IncomeSourceType = z.infer<typeof IncomeSourceSchema>;
export type IncomeSourceScheduleType = z.infer<typeof IncomeSourceScheduleSchema>;
export type IncomeEventType = z.infer<typeof IncomeEventSchema>;
export type AllocationPlanType = z.infer<typeof AllocationPlanSchema>;
export type AllocationPlanLineType = z.infer<typeof AllocationPlanLineSchema>;
export type TransactionLedgerType = z.infer<typeof TransactionLedgerSchema>;
export type ShortfallEventType = z.infer<typeof ShortfallEventSchema>;
export type SavingsReconciliationType = z.infer<typeof SavingsReconciliationSchema>;
