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
  bankProvider: z.enum(["CBA", "Westpac", "ANZ", "NAB", "ING", "Macquarie", "Other"]).default("CBA").optional(),
  lastKnownBalance: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0.00").optional(),
  unbudgetedBuffer: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0.00").optional(),
  isPrivate: z.boolean().default(false).optional(),
  userId: z.string().uuid().optional(),
}).strict();

export const UpdateBankAccountCommand = z.object({
  name: z.string().min(1).optional(),
  bankProvider: z.enum(["CBA", "Westpac", "ANZ", "NAB", "ING", "Macquarie", "Other"]).optional(),
  lastKnownBalance: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  unbudgetedBuffer: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  isPrivate: z.boolean().optional(),
  userId: z.string().uuid().optional(),
}).strict();

export const CreatePoolCommand = z.object({
  name: z.string().min(1),
  poolType: z.enum(["EVERYDAY", "REGULAR", "GOAL"]),
  bankAccountId: z.string().uuid(),
  everydayAllowanceAmount: z.string().regex(/^(\d+(\.\d{1,2})?)?$/).optional().nullable(),
  rolloverRule: z.enum(["ROLLOVER", "SWEEP", "RESET"]).optional(),
  targetAmount: z.string().regex(/^(\d+(\.\d{1,2})?)?$/).optional().nullable(),
  targetDate: z.string().optional().nullable(),
  isCommitted: z.boolean().default(false).optional(),
  isSurplusTarget: z.boolean().default(false).optional(),
  waterfallPriority: z.number().int().optional(),
}).strict();

export const UpdatePoolCommand = z.object({
  name: z.string().min(1).optional(),
  bankAccountId: z.string().uuid().optional(),
  everydayAllowanceAmount: z.string().regex(/^(\d+(\.\d{1,2})?)?$/).optional().nullable(),
  rolloverRule: z.enum(["ROLLOVER", "SWEEP", "RESET"]).optional(),
  targetAmount: z.string().regex(/^(\d+(\.\d{1,2})?)?$/).optional().nullable(),
  targetDate: z.string().optional().nullable(),
  isCommitted: z.boolean().optional(),
  isSurplusTarget: z.boolean().optional(),
  waterfallPriority: z.number().int().optional(),
}).strict();

export const CreateCategoryCommand = z.object({
  poolId: z.string().uuid(),
  name: z.string().min(1),
  isEssential: z.boolean().default(false).optional(),
  monthlyAmount: z.string().regex(/^(\d+(\.\d{1,2})?)?$/).optional().nullable(),
  enteredAmount: z.string().regex(/^(\d+(\.\d{1,2})?)?$/).optional().nullable(),
  budgetFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  icon: z.string().optional().nullable(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
}).strict();

export const UpdateCategoryCommand = z.object({
  name: z.string().min(1).optional(),
  poolId: z.string().uuid().optional(),
  isEssential: z.boolean().optional(),
  monthlyAmount: z.string().regex(/^(\d+(\.\d{1,2})?)?$/).optional().nullable(),
  enteredAmount: z.string().regex(/^(\d+(\.\d{1,2})?)?$/).optional().nullable(),
  budgetFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  icon: z.string().optional().nullable(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
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
  poolId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  bankAccountId: z.string().uuid().optional().nullable(),
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
  sourcePoolId: z.string().uuid(),
  destinationPoolId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  note: z.string().optional(),
}).strict();

export const OverrideEventCommand = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum(["INCOME", "EXPENSE"]),
  status: z.enum(["UPCOMING", "CONFIRMED", "PAID", "SKIPPED"]).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  actualAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  expectedDate: z.string().optional(),
  name: z.string().optional(),
  poolId: z.string().uuid().optional(),
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
      poolId: z.string().uuid(),
      categoryId: z.string().uuid().optional(),
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
  poolId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  bankAccountId: z.string().uuid().optional().nullable(),
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

export const CreateCheckoutSessionCommand = z.object({
  priceId: z.string().min(1).optional(),
  planType: z.enum(["monthly", "annual", "founding"]).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
}).strict();

export const CreateCustomerPortalCommand = z.object({
  returnUrl: z.string().url(),
}).strict();

export const CsvImportItemSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  flowType: z.enum(["DEBIT", "CREDIT"]),
  targetPoolType: z.enum(["EVERYDAY", "REGULAR", "GOAL"]).optional().nullable(),
  poolId: z.string().uuid().optional().nullable(),
  creditAction: z.enum(["BANK_DEPOSIT", "PAYDAY_ALLOCATION"]).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  incomeSourceId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().min(1),
  note: z.string().optional().nullable(),
  isIncluded: z.boolean().optional().default(true),
}).strict();

export const CommitCsvImportCommand = z.object({
  bankAccountId: z.string().uuid(),
  transactions: z.array(CsvImportItemSchema).min(1).max(1000, "Cannot commit more than 1,000 transactions at once"),
}).strict();

export const ReSetupBudgetInputSchema = z.object({
  tenantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  everydayTargetCap: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  billsTargetCap: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  poolsList: z.array(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      poolType: z.enum(["EVERYDAY", "REGULAR", "GOAL"]),
      bankAccountId: z.string().uuid().optional(),
      everydayAllowanceAmount: z.string().optional().nullable(),
      targetAmount: z.string().optional().nullable(),
      targetDate: z.string().optional().nullable(),
      isCommitted: z.boolean().optional(),
      isSurplusTarget: z.boolean().optional(),
      categories: z.array(
        z.object({
          id: z.string().uuid().optional(),
          name: z.string().min(1),
          monthlyAmount: z.string().optional().nullable(),
          isEssential: z.boolean().optional(),
          icon: z.string().optional().nullable(),
          colour: z.string().optional().nullable(),
        }).strict()
      ).optional().default([]),
    }).strict()
  ),
}).strict();
