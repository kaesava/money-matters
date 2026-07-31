import { z } from "zod";
export declare const CreateTenantCommand: z.ZodObject<{
    name: z.ZodString;
}, "strict", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const UpdateTenantCommand: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    fyEndMonthDay: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name?: string | undefined;
    fyEndMonthDay?: string | undefined;
}, {
    name?: string | undefined;
    fyEndMonthDay?: string | undefined;
}>;
export declare const CreateBankAccountCommand: z.ZodObject<{
    name: z.ZodString;
    lastKnownBalance: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    unbudgetedBuffer: z.ZodOptional<z.ZodDefault<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    name: string;
    lastKnownBalance?: string | undefined;
    unbudgetedBuffer?: string | undefined;
}, {
    name: string;
    lastKnownBalance?: string | undefined;
    unbudgetedBuffer?: string | undefined;
}>;
export declare const UpdateBankAccountCommand: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    lastKnownBalance: z.ZodOptional<z.ZodString>;
    unbudgetedBuffer: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name?: string | undefined;
    lastKnownBalance?: string | undefined;
    unbudgetedBuffer?: string | undefined;
}, {
    name?: string | undefined;
    lastKnownBalance?: string | undefined;
    unbudgetedBuffer?: string | undefined;
}>;
export declare const CreateCategoryCommand: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["REGULAR", "GOAL", "EVERYDAY"]>;
    isCommitted: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    monthlyAmount: z.ZodOptional<z.ZodString>;
    everydayAllowanceAmount: z.ZodOptional<z.ZodString>;
    budgetFrequency: z.ZodOptional<z.ZodEnum<["FORTNIGHTLY", "MONTHLY", "ANNUALLY"]>>;
    targetAmount: z.ZodOptional<z.ZodString>;
    targetDate: z.ZodOptional<z.ZodString>;
    isDefaultExcess: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    rolloverRule: z.ZodOptional<z.ZodEnum<["ROLLOVER", "SWEEP", "RESET"]>>;
    isDefaultSavings: z.ZodOptional<z.ZodBoolean>;
    icon: z.ZodOptional<z.ZodString>;
    colour: z.ZodOptional<z.ZodString>;
    bankAccountId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    type: "REGULAR" | "GOAL" | "EVERYDAY";
    isCommitted?: boolean | undefined;
    monthlyAmount?: string | undefined;
    everydayAllowanceAmount?: string | undefined;
    isDefaultExcess?: boolean | undefined;
    rolloverRule?: "ROLLOVER" | "SWEEP" | "RESET" | undefined;
    isDefaultSavings?: boolean | undefined;
    icon?: string | undefined;
    colour?: string | undefined;
    budgetFrequency?: "MONTHLY" | "FORTNIGHTLY" | "ANNUALLY" | undefined;
    bankAccountId?: string | undefined;
    targetAmount?: string | undefined;
    targetDate?: string | undefined;
}, {
    name: string;
    type: "REGULAR" | "GOAL" | "EVERYDAY";
    isCommitted?: boolean | undefined;
    monthlyAmount?: string | undefined;
    everydayAllowanceAmount?: string | undefined;
    isDefaultExcess?: boolean | undefined;
    rolloverRule?: "ROLLOVER" | "SWEEP" | "RESET" | undefined;
    isDefaultSavings?: boolean | undefined;
    icon?: string | undefined;
    colour?: string | undefined;
    budgetFrequency?: "MONTHLY" | "FORTNIGHTLY" | "ANNUALLY" | undefined;
    bankAccountId?: string | undefined;
    targetAmount?: string | undefined;
    targetDate?: string | undefined;
}>;
export declare const UpdateCategoryCommand: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["REGULAR", "GOAL", "EVERYDAY"]>>;
    isCommitted: z.ZodOptional<z.ZodBoolean>;
    monthlyAmount: z.ZodOptional<z.ZodString>;
    everydayAllowanceAmount: z.ZodOptional<z.ZodString>;
    budgetFrequency: z.ZodOptional<z.ZodEnum<["FORTNIGHTLY", "MONTHLY", "ANNUALLY"]>>;
    targetAmount: z.ZodOptional<z.ZodString>;
    targetDate: z.ZodOptional<z.ZodString>;
    isDefaultExcess: z.ZodOptional<z.ZodBoolean>;
    rolloverRule: z.ZodOptional<z.ZodEnum<["ROLLOVER", "SWEEP", "RESET"]>>;
    isDefaultSavings: z.ZodOptional<z.ZodBoolean>;
    icon: z.ZodOptional<z.ZodString>;
    colour: z.ZodOptional<z.ZodString>;
    bankAccountId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name?: string | undefined;
    type?: "REGULAR" | "GOAL" | "EVERYDAY" | undefined;
    isCommitted?: boolean | undefined;
    monthlyAmount?: string | undefined;
    everydayAllowanceAmount?: string | undefined;
    isDefaultExcess?: boolean | undefined;
    rolloverRule?: "ROLLOVER" | "SWEEP" | "RESET" | undefined;
    isDefaultSavings?: boolean | undefined;
    icon?: string | undefined;
    colour?: string | undefined;
    budgetFrequency?: "MONTHLY" | "FORTNIGHTLY" | "ANNUALLY" | undefined;
    bankAccountId?: string | undefined;
    targetAmount?: string | undefined;
    targetDate?: string | undefined;
}, {
    name?: string | undefined;
    type?: "REGULAR" | "GOAL" | "EVERYDAY" | undefined;
    isCommitted?: boolean | undefined;
    monthlyAmount?: string | undefined;
    everydayAllowanceAmount?: string | undefined;
    isDefaultExcess?: boolean | undefined;
    rolloverRule?: "ROLLOVER" | "SWEEP" | "RESET" | undefined;
    isDefaultSavings?: boolean | undefined;
    icon?: string | undefined;
    colour?: string | undefined;
    budgetFrequency?: "MONTHLY" | "FORTNIGHTLY" | "ANNUALLY" | undefined;
    bankAccountId?: string | undefined;
    targetAmount?: string | undefined;
    targetDate?: string | undefined;
}>;
export declare const CreateCategoryScheduleCommand: z.ZodObject<{
    categoryId: z.ZodString;
    targetAmount: z.ZodString;
    targetDate: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
    rrule: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    categoryId: string;
    targetAmount: string;
    dueDate?: string | undefined;
    targetDate?: string | undefined;
    rrule?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    categoryId: string;
    targetAmount: string;
    dueDate?: string | undefined;
    targetDate?: string | undefined;
    rrule?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const CreateIncomeSourceCommand: z.ZodObject<{
    name: z.ZodString;
    amount: z.ZodString;
    receivingAccountId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    amount: string;
    receivingAccountId?: string | undefined;
}, {
    name: string;
    amount: string;
    receivingAccountId?: string | undefined;
}>;
export declare const UpdateIncomeSourceCommand: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodString>;
    receivingAccountId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name?: string | undefined;
    amount?: string | undefined;
    receivingAccountId?: string | undefined;
}, {
    name?: string | undefined;
    amount?: string | undefined;
    receivingAccountId?: string | undefined;
}>;
export declare const CreateIncomeSourceScheduleCommand: z.ZodObject<{
    incomeSourceId: z.ZodString;
    rrule: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodString>;
    occurrenceCount: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    rrule: string;
    startDate: string;
    incomeSourceId: string;
    endDate?: string | undefined;
    occurrenceCount?: number | undefined;
}, {
    rrule: string;
    startDate: string;
    incomeSourceId: string;
    endDate?: string | undefined;
    occurrenceCount?: number | undefined;
}>;
export declare const CreateIncomeEventCommand: z.ZodObject<{
    incomeSourceId: z.ZodString;
    expectedDate: z.ZodString;
    expectedAmount: z.ZodString;
}, "strict", z.ZodTypeAny, {
    incomeSourceId: string;
    expectedDate: string;
    expectedAmount: string;
}, {
    incomeSourceId: string;
    expectedDate: string;
    expectedAmount: string;
}>;
export declare const RecordExpenseCommand: z.ZodObject<{
    categoryId: z.ZodString;
    bankAccountId: z.ZodOptional<z.ZodString>;
    amount: z.ZodString;
    flowType: z.ZodDefault<z.ZodOptional<z.ZodEnum<["DEBIT", "CREDIT"]>>>;
    date: z.ZodOptional<z.ZodString>;
    recordedAt: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
    source: z.ZodDefault<z.ZodOptional<z.ZodEnum<["MANUAL", "AUTO", "IMPORT"]>>>;
    transferGroupId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    categoryId: string;
    amount: string;
    flowType: "DEBIT" | "CREDIT";
    source: "MANUAL" | "AUTO" | "IMPORT";
    date?: string | undefined;
    bankAccountId?: string | undefined;
    note?: string | undefined;
    idempotencyKey?: string | undefined;
    transferGroupId?: string | undefined;
    recordedAt?: string | undefined;
}, {
    categoryId: string;
    amount: string;
    date?: string | undefined;
    bankAccountId?: string | undefined;
    note?: string | undefined;
    flowType?: "DEBIT" | "CREDIT" | undefined;
    idempotencyKey?: string | undefined;
    source?: "MANUAL" | "AUTO" | "IMPORT" | undefined;
    transferGroupId?: string | undefined;
    recordedAt?: string | undefined;
}>;
export declare const MoveMoneyCommand: z.ZodObject<{
    sourceCategoryId: z.ZodString;
    destinationCategoryId: z.ZodString;
    amount: z.ZodString;
}, "strict", z.ZodTypeAny, {
    amount: string;
    sourceCategoryId: string;
    destinationCategoryId: string;
}, {
    amount: string;
    sourceCategoryId: string;
    destinationCategoryId: string;
}>;
export declare const OverrideEventCommand: z.ZodObject<{
    eventId: z.ZodString;
    eventType: z.ZodEnum<["INCOME", "EXPENSE"]>;
    amount: z.ZodString;
    expectedDate: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
    updateSeries: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    amount: string;
    expectedDate: string;
    eventId: string;
    eventType: "INCOME" | "EXPENSE";
    updateSeries: boolean;
    name?: string | undefined;
    categoryId?: string | undefined;
    note?: string | undefined;
}, {
    amount: string;
    expectedDate: string;
    eventId: string;
    eventType: "INCOME" | "EXPENSE";
    name?: string | undefined;
    categoryId?: string | undefined;
    note?: string | undefined;
    updateSeries?: boolean | undefined;
}>;
export declare const DeleteUpcomingEventCommand: z.ZodObject<{
    eventId: z.ZodString;
    eventType: z.ZodEnum<["INCOME", "EXPENSE"]>;
}, "strict", z.ZodTypeAny, {
    eventId: string;
    eventType: "INCOME" | "EXPENSE";
}, {
    eventId: string;
    eventType: "INCOME" | "EXPENSE";
}>;
export declare const BulkDeleteEventsCommand: z.ZodObject<{
    incomeEventIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    expenseEventIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    incomeEventIds: string[];
    expenseEventIds: string[];
}, {
    incomeEventIds?: string[] | undefined;
    expenseEventIds?: string[] | undefined;
}>;
export declare const ConfirmPaydayCommand: z.ZodObject<{
    incomeEventId: z.ZodString;
    actualAmount: z.ZodString;
    markAsReceivedToday: z.ZodOptional<z.ZodBoolean>;
    lines: z.ZodArray<z.ZodObject<{
        bucketId: z.ZodString;
        amount: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        amount: string;
        bucketId: string;
    }, {
        amount: string;
        bucketId: string;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    actualAmount: string;
    incomeEventId: string;
    lines: {
        amount: string;
        bucketId: string;
    }[];
    markAsReceivedToday?: boolean | undefined;
}, {
    actualAmount: string;
    incomeEventId: string;
    lines: {
        amount: string;
        bucketId: string;
    }[];
    markAsReceivedToday?: boolean | undefined;
}>;
export declare const InvitePartnerCommand: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["MEMBER", "OWNER"]>>;
    ttlHours: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    email: string;
    role: "OWNER" | "MEMBER";
    ttlHours: number;
}, {
    email: string;
    role?: "OWNER" | "MEMBER" | undefined;
    ttlHours?: number | undefined;
}>;
export declare const AcceptInviteCommand: z.ZodObject<{
    inviteToken: z.ZodString;
    userEmail: z.ZodString;
}, "strict", z.ZodTypeAny, {
    inviteToken: string;
    userEmail: string;
}, {
    inviteToken: string;
    userEmail: string;
}>;
export declare const SyncLedgerMutationCommand: z.ZodObject<{
    clientMutationId: z.ZodString;
    idempotencyKey: z.ZodString;
    clientTimestamp: z.ZodString;
    categoryId: z.ZodString;
    bankAccountId: z.ZodOptional<z.ZodString>;
    amount: z.ZodString;
    flowType: z.ZodEnum<["DEBIT", "CREDIT"]>;
    note: z.ZodOptional<z.ZodString>;
    source: z.ZodDefault<z.ZodEnum<["MANUAL", "AUTO", "IMPORT"]>>;
}, "strict", z.ZodTypeAny, {
    categoryId: string;
    amount: string;
    flowType: "DEBIT" | "CREDIT";
    idempotencyKey: string;
    source: "MANUAL" | "AUTO" | "IMPORT";
    clientMutationId: string;
    clientTimestamp: string;
    bankAccountId?: string | undefined;
    note?: string | undefined;
}, {
    categoryId: string;
    amount: string;
    flowType: "DEBIT" | "CREDIT";
    idempotencyKey: string;
    clientMutationId: string;
    clientTimestamp: string;
    bankAccountId?: string | undefined;
    note?: string | undefined;
    source?: "MANUAL" | "AUTO" | "IMPORT" | undefined;
}>;
export declare const WaterfallExecutionPayload: z.ZodObject<{
    tenantId: z.ZodString;
    incomeEventId: z.ZodString;
    paycheckAmount: z.ZodString;
    idempotencyKey: z.ZodString;
    executionLockId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    tenantId: string;
    incomeEventId: string;
    idempotencyKey: string;
    paycheckAmount: string;
    executionLockId: string;
}, {
    tenantId: string;
    incomeEventId: string;
    idempotencyKey: string;
    paycheckAmount: string;
    executionLockId: string;
}>;
//# sourceMappingURL=commands.types.d.ts.map