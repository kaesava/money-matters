import { z } from "zod";

export const CreateTenantCommand = z.object({
  name: z.string().min(1),
  country: z.string().length(2),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
}).strict();

export const UpdateTenantCommand = z.object({
  name: z.string().min(1).optional(),
  country: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
}).strict();

export const UpdateUserPreferencesCommand = z.object({
  timezone: z.string().optional(),
  language: z.enum(["en"]).optional(),
  locale: z.string().optional(),
  theme: z.string().optional(),
  showIcons: z.boolean().optional(),
  setupCompleted: z.boolean().optional(),
  appPreferences: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
}).strict();

export const AccountTypeSchema = z.enum(["EVERYDAY", "SAVINGS", "LOAN_OFFSET"]);

export const CreateBankAccountCommand = z.object({
  name: z.string().min(1),
  bankProvider: z.enum(["CBA", "Westpac", "ANZ", "NAB", "ING", "Macquarie", "Other"]).default("Other"),
  accountType: AccountTypeSchema.default("EVERYDAY"),
  lastKnownBalance: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).default("0.00"),
  unbudgetedBuffer: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).default("0.00"),
  isPrivate: z.boolean().default(false),
}).strict();

export const UpdateBankAccountCommand = z.object({
  name: z.string().min(1).optional(),
  bankProvider: z.enum(["CBA", "Westpac", "ANZ", "NAB", "ING", "Macquarie", "Other"]).optional(),
  accountType: AccountTypeSchema.optional(),
  lastKnownBalance: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).optional(),
  unbudgetedBuffer: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).optional(),
  lastBalanceMatchedAt: z.string().optional(),
  isPrivate: z.boolean().optional(),
}).strict();

export const CreateEnvelopeCommand = z.object({
  name: z.string().min(1, "Envelope name is required"),
  envelopeType: z.enum([
    "EVERYDAY",
    "SCHEDULED_BILL",
    "FLEXIBLE_BILL",
    "TARGET_GOAL",
    "ONGOING_GOAL",
  ]),
  bankAccountId: z.string().uuid("Please select a bank account"),
  safetyBufferFloor: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/, { message: "Safety buffer must be a valid positive number" }).optional().nullable(),
  monthlyAmount: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/, { message: "Target amount must be a valid positive number" }).optional().nullable(),
  enteredAmount: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/, { message: "Entered amount must be a valid positive number" }).optional().nullable(),
  budgetFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  rrule: z.string().optional().nullable(),
  goalMode: z.enum(["TARGET_DATE", "ONGOING"]).optional().default("TARGET_DATE"),
  targetAmount: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/, { message: "Target amount must be a valid positive number" }).optional().nullable(),
  isEssential: z.boolean().default(false).optional(),
  isCommitted: z.boolean().default(false).optional(),
  isSurplusTarget: z.boolean().default(false).optional(),
  isPrivate: z.boolean().default(false).optional(),
  emoji: z.string().max(16).optional().nullable(),
  colorKey: z.string().max(30).optional().nullable(),
  orderIndex: z.number().int().default(0).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.envelopeType === "TARGET_GOAL" || data.envelopeType === "ONGOING_GOAL") {
    const hasAmount = (data.targetAmount && parseFloat(data.targetAmount) > 0) || (data.enteredAmount && parseFloat(data.enteredAmount) > 0);
    if (!hasAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Goal amount is required for Goal envelopes and must be greater than 0",
        path: ["targetAmount"],
      });
    }
    if (data.envelopeType === "TARGET_GOAL" && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completion date is required for Target Date Goal envelopes",
        path: ["endDate"],
      });
    }
  }
});

export const UpdateEnvelopeCommand = z.object({
  name: z.string().min(1, "Envelope name is required").optional(),
  envelopeType: z.enum(["EVERYDAY", "SCHEDULED_BILL", "FLEXIBLE_BILL", "TARGET_GOAL", "ONGOING_GOAL"]).optional(),
  bankAccountId: z.string().uuid("Please select a bank account").optional(),
  safetyBufferFloor: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/, { message: "Safety buffer must be a valid positive number" }).optional().nullable(),
  monthlyAmount: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/, { message: "Target amount must be a valid positive number" }).optional().nullable(),
  enteredAmount: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/, { message: "Entered amount must be a valid positive number" }).optional().nullable(),
  budgetFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  rrule: z.string().optional().nullable(),
  goalMode: z.enum(["TARGET_DATE", "ONGOING"]).optional(),
  targetAmount: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/, { message: "Target amount must be a valid positive number" }).optional().nullable(),
  isEssential: z.boolean().optional(),
  isCommitted: z.boolean().optional(),
  isSurplusTarget: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  emoji: z.string().max(16).optional().nullable(),
  colorKey: z.string().max(30).optional().nullable(),
  orderIndex: z.number().int().optional(),
}).strict();

export const CreateIncomeSourceCommand = z.object({
  name: z.string().min(1),
  amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),
  receivingAccountId: z.string().uuid().optional(),
}).strict();

export const UpdateIncomeSourceCommand = z.object({
  name: z.string().min(1).optional(),
  amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).optional(),
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
  expectedAmount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),
}).strict();

export const TransactionTypeSchema = z.enum([
  "EXPENSE",
  "INCOME_SPLIT",
  "INCOME_DIRECT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "ACCOUNT_ALIGNMENT",
  "BALANCE_ADJUSTMENT",
  "OPENING_BALANCE",
]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const RecordExpenseCommand = z.object({
  envelopeId: z.string().uuid(),
  bankAccountId: z.string().uuid().optional().nullable(),
  amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),
  flowType: z.enum(["DEBIT", "CREDIT"]).optional().default("DEBIT"),
  transactionType: TransactionTypeSchema.optional(),
  date: z.string().optional(),
  recordedAt: z.string().optional(),
  idempotencyKey: z.string().optional(),
  note: z.string().optional(),
  source: z.enum(["MANUAL", "AUTO", "IMPORT"]).default("MANUAL"),
  transferGroupId: z.string().uuid().optional(),
}).strict();

export const MoveMoneyCommand = z.object({
  sourceEnvelopeId: z.string().uuid(),
  destinationEnvelopeId: z.string().uuid(),
  amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  note: z.string().optional(),
  targetDate: z.string().optional(),
  idempotencyKey: z.string().optional(),
}).strict().superRefine((data, ctx) => {
  if (data.targetDate) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
    if (data.targetDate < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Transfers cannot be recorded for past dates.",
        path: ["targetDate"],
      });
    }
  }
});

export const OverrideEventCommand = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum(["INCOME", "EXPENSE"]),
  status: z.enum(["PENDING", "SKIPPED", "CONFIRMED"]).optional(),
  amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).optional(),
  expectedAmount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).optional(),
  actualAmount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).optional(),
  expectedDate: z.string().optional(),
  actualDate: z.string().optional(),
  name: z.string().optional(),
  envelopeId: z.string().uuid().optional(),
  note: z.string().optional(),
  updateSeries: z.boolean().default(false),
}).strict().refine((val) => !(val.eventType === "EXPENSE" && val.status === "CONFIRMED"), {
  message: "Expense events cannot be set to CONFIRMED status",
  path: ["status"],
});

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
  actualAmount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),
  markAsReceivedToday: z.boolean().optional(),
  runwayDays: z.number().int().min(1).max(365).optional().default(30),
  lines: z.array(
    z.object({
      envelopeId: z.string().uuid(),
      amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),
      reasoning: z.string().optional(),
    }).strict()
  ).min(1, "At least one allocation line is required"),
}).strict().refine((data) => {
  const actual = parseFloat(data.actualAmount);
  const sum = data.lines.reduce((acc, l) => acc + parseFloat(l.amount), 0);
  return Math.abs(actual - sum) <= 0.02;
}, {
  message: "Sum of allocation lines must equal total actual income amount",
  path: ["lines"],
});

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
  envelopeId: z.string().uuid(),
  bankAccountId: z.string().uuid().optional().nullable(),
  amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),
  flowType: z.enum(["DEBIT", "CREDIT"]),
  transactionType: TransactionTypeSchema.optional(),
  note: z.string().optional(),
  source: z.enum(["MANUAL", "AUTO", "IMPORT"]).default("MANUAL"),
}).strict();

export const WaterfallExecutionPayload = z.object({
  tenantId: z.string().uuid(),
  incomeEventId: z.string().uuid(),
  paycheckAmount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),
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

export const VerifyCheckoutSessionCommand = z.object({
  sessionId: z.string().min(1),
}).strict();

export const BillingInvoiceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  stripeInvoiceId: z.string(),
  amountPaid: z.string(),
  currency: z.string(),
  status: z.string(),
  paidAt: z.date().nullable(),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
  invoicePdfUrl: z.string().nullable(),
  hostedInvoiceUrl: z.string().nullable(),
  createdAt: z.date(),
}).strict();
export type BillingInvoiceDto = z.infer<typeof BillingInvoiceSchema>;

export const SaveSetupBudgetCommand = z.object({
  incomes: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(100),
    incomeType: z.enum(["SALARIED", "IRREGULAR"]).default("SALARIED"),
    type: z.enum(["SALARY", "FREELANCE", "INVESTMENT", "OTHER"]),
    amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),
    frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "CUSTOM"]).optional().default("FORTNIGHTLY"),
    receivingAccountId: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    rrule: z.string().optional().nullable(),
  }).strict()).min(1),
  bankAccounts: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(100),
    bankProvider: z.string().optional().nullable().default("Other"),
    accountType: AccountTypeSchema.default("EVERYDAY").optional(),
    lastKnownBalance: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).default("0.00"),
    unbudgetedBuffer: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).default("0.00"),
    isPrivate: z.boolean().default(false),
  }).strict()).min(1),
  envelopes: z.array(z.object({
    id: z.string().optional(),
    bankAccountId: z.string().optional().nullable(),
    name: z.string().min(1).max(100),
    envelopeType: z.enum([
      "EVERYDAY",
      "SCHEDULED_BILL",
      "FLEXIBLE_BILL",
      "TARGET_GOAL",
      "ONGOING_GOAL",
    ]),
    goalMode: z.enum(["TARGET_DATE", "ONGOING"]).optional(),
    targetAmount: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/).optional().nullable(),
    monthlyAmount: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/).optional().nullable(),
    enteredAmount: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/).optional().nullable(),
    budgetFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    rrule: z.string().optional().nullable(),
    safetyBufferFloor: z.string().regex(/^(\d{1,12}(\.\d{1,2})?)?$/).optional().nullable(),
    isSurplusTarget: z.boolean().default(false),
    isCommitted: z.boolean().default(false),
    isEssential: z.boolean().default(false),
    isPrivate: z.boolean().default(false),
    orderIndex: z.number().int().default(0),
  }).strict()).min(1),
  archivedEnvelopeIds: z.array(z.string()).default([]),
  archivedAccountIds: z.array(z.string()).default([]),
  archivedIncomeIds: z.array(z.string()).default([]),
  autoCreateIncomeEvents: z.boolean().default(true),
}).strict();

export const CreateOneOffExpenseCommand = z.object({
  envelopeId: z.string().uuid("Please select an envelope"),
  name: z.string().min(1, "Expense description is required"),
  amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, "Amount must be a valid positive number").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  expectedDate: z.string().min(1, "Expected date is required"),
  note: z.string().optional().nullable(),
}).strict();

