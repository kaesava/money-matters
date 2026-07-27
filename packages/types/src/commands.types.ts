import { z } from "zod";

export const CreateTenantCommand = z.object({
  name: z.string().min(1),
}).strict();

export const UpdateTenantCommand = z.object({
  name: z.string().min(1).optional(),
  fyEndMonthDay: z.string().regex(/^\d{2}-\d{2}$/).optional(),
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

export const CreateCategoryCommand = z.object({
  name: z.string().min(1),
  type: z.enum(["REGULAR", "GOAL", "EVERYDAY"]),
  isCommitted: z.boolean().default(false).optional(),
  monthlyAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  everydayAllowanceAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  budgetFrequency: z.enum(["FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  targetDate: z.string().optional(),
  isDefaultExcess: z.boolean().default(false).optional(),
  rolloverRule: z.enum(["ROLLOVER", "SWEEP", "RESET"]).optional(),
  isDefaultSavings: z.boolean().optional(),
  icon: z.string().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bankAccountId: z.string().uuid().optional(),
}).strict();

export const UpdateCategoryCommand = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["REGULAR", "GOAL", "EVERYDAY"]).optional(),
  isCommitted: z.boolean().optional(),
  monthlyAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  everydayAllowanceAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  budgetFrequency: z.enum(["FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  targetDate: z.string().optional(),
  isDefaultExcess: z.boolean().optional(),
  rolloverRule: z.enum(["ROLLOVER", "SWEEP", "RESET"]).optional(),
  isDefaultSavings: z.boolean().optional(),
  icon: z.string().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bankAccountId: z.string().uuid().optional(),
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

export const CreateIncomeSourceScheduleCommand = z.object({
  incomeSourceId: z.string().uuid(),
  rrule: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  occurrenceCount: z.number().int().optional(),
}).strict();

export const CreateIncomeEventCommand = z.object({
  incomeSourceId: z.string().uuid(),
  expectedDate: z.string(),
  expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
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

export const MoveMoneyCommand = z.object({
  sourceCategoryId: z.string().uuid(),
  destinationCategoryId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).strict();

export const OverrideEventCommand = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum(["INCOME", "EXPENSE"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  expectedDate: z.string(),
  name: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  note: z.string().optional(),
  updateSeries: z.boolean().default(false),
}).strict();

export const DeleteUpcomingEventCommand = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum(["INCOME", "EXPENSE"]),
}).strict();

export const BulkDeleteEventsCommand = z.object({
  incomeEventIds: z.array(z.string().uuid()).default([]),
  expenseEventIds: z.array(z.string().uuid()).default([]),
}).strict();

export const ConfirmPaydayCommand = z.object({
  incomeEventId: z.string().uuid(),
  actualAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  markAsReceivedToday: z.boolean().optional(),
  lines: z.array(
    z.object({
      bucketId: z.string().uuid(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    }).strict()
  ),
}).strict();

export const InvitePartnerCommand = z.object({
  email: z.string().email(),
  role: z.enum(["MEMBER", "OWNER"]).default("MEMBER"),
  ttlHours: z.number().int().min(1).max(168).default(72),
}).strict();

export const AcceptInviteCommand = z.object({
  inviteToken: z.string().uuid(),
  userEmail: z.string().email(),
}).strict();

export const SyncLedgerMutationCommand = z.object({
  clientMutationId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  clientTimestamp: z.string().datetime(),
  categoryId: z.string().uuid(),
  bankAccountId: z.string().uuid().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  flowType: z.enum(["DEBIT", "CREDIT"]),
  note: z.string().optional(),
  source: z.enum(["MANUAL", "AUTO", "IMPORT"]).default("MANUAL"),
}).strict();

export const WaterfallExecutionPayload = z.object({
  tenantId: z.string().uuid(),
  incomeEventId: z.string().uuid(),
  paycheckAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  idempotencyKey: z.string().min(1),
  executionLockId: z.string().uuid(),
}).strict();

