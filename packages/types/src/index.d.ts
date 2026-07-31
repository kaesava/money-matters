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
export declare const BaseSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
}, "strict", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
}>;
export * from "./status.types.js";
export * from "./commands.types.js";
export * from "./setup-presets.js";
/**
 * Schema validating Tenant organisation details including fiscal year parameters and premium feature flags.
 */
export declare const TenantSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    name: z.ZodString;
    fyEndMonthDay: z.ZodDefault<z.ZodString>;
    premiumEnabled: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    fyEndMonthDay: string;
    premiumEnabled: boolean;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
}, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    fyEndMonthDay?: string | undefined;
    premiumEnabled?: boolean | undefined;
}>;
/**
 * Schema validating tenant membership access control, role levels, and pending invite tokens.
 */
export declare const TenantMemberSchema: z.ZodObject<{
    id: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    tenantId: z.ZodString;
    userId: z.ZodString;
    role: z.ZodEnum<["OWNER", "MEMBER"]>;
    inviteToken: z.ZodNullable<z.ZodString>;
    inviteStatus: z.ZodEnum<["PENDING", "ACCEPTED", "REVOKED"]>;
}, "strict", z.ZodTypeAny, {
    userId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    role: "OWNER" | "MEMBER";
    inviteToken: string | null;
    inviteStatus: "PENDING" | "ACCEPTED" | "REVOKED";
}, {
    userId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    role: "OWNER" | "MEMBER";
    inviteToken: string | null;
    inviteStatus: "PENDING" | "ACCEPTED" | "REVOKED";
}>;
/**
 * Schema validating financial bank account tracking entities within a tenant partition.
 */
export declare const BankAccountSchema: z.ZodObject<{
    id: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    tenantId: z.ZodString;
    name: z.ZodString;
    lastKnownBalance: z.ZodDefault<z.ZodString>;
    unbudgetedBuffer: z.ZodDefault<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    lastKnownBalance: string;
    unbudgetedBuffer: string;
}, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    lastKnownBalance?: string | undefined;
    unbudgetedBuffer?: string | undefined;
}>;
/**
 * Schema defining spending and savings categories across the 3-bucket architecture (REGULAR, GOAL, EVERYDAY).
 */
export declare const CategorySchema: z.ZodObject<{
    id: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    tenantId: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["REGULAR", "GOAL", "EVERYDAY"]>;
    isCommitted: z.ZodDefault<z.ZodBoolean>;
    monthlyAmount: z.ZodNullable<z.ZodString>;
    budgetFrequency: z.ZodDefault<z.ZodEnum<["FORTNIGHTLY", "MONTHLY", "ANNUALLY"]>>;
    isDefaultExcess: z.ZodDefault<z.ZodBoolean>;
    rolloverRule: z.ZodDefault<z.ZodEnum<["ROLLOVER", "SWEEP", "RESET"]>>;
    isDefaultSavings: z.ZodDefault<z.ZodBoolean>;
    everydayTargetKeepAmount: z.ZodNullable<z.ZodString>;
    everydaySweepFrequency: z.ZodNullable<z.ZodString>;
    icon: z.ZodNullable<z.ZodString>;
    colour: z.ZodNullable<z.ZodString>;
    bankAccountId: z.ZodNullable<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    type: "REGULAR" | "GOAL" | "EVERYDAY";
    isCommitted: boolean;
    monthlyAmount: string | null;
    isDefaultExcess: boolean;
    rolloverRule: "ROLLOVER" | "SWEEP" | "RESET";
    isDefaultSavings: boolean;
    icon: string | null;
    colour: string | null;
    budgetFrequency: "MONTHLY" | "FORTNIGHTLY" | "ANNUALLY";
    bankAccountId: string | null;
    everydayTargetKeepAmount: string | null;
    everydaySweepFrequency: string | null;
}, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    type: "REGULAR" | "GOAL" | "EVERYDAY";
    monthlyAmount: string | null;
    icon: string | null;
    colour: string | null;
    bankAccountId: string | null;
    everydayTargetKeepAmount: string | null;
    everydaySweepFrequency: string | null;
    isCommitted?: boolean | undefined;
    isDefaultExcess?: boolean | undefined;
    rolloverRule?: "ROLLOVER" | "SWEEP" | "RESET" | undefined;
    isDefaultSavings?: boolean | undefined;
    budgetFrequency?: "MONTHLY" | "FORTNIGHTLY" | "ANNUALLY" | undefined;
}>;
/**
 * Schema for category recurring target dates, due dates, and schedule parameters.
 */
export declare const CategoryScheduleSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    categoryId: z.ZodString;
    targetAmount: z.ZodString;
    dueDate: z.ZodNullable<z.ZodString>;
    targetDate: z.ZodNullable<z.ZodString>;
    rrule: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    startDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    categoryId: string;
    targetAmount: string;
    dueDate: string | null;
    targetDate: string | null;
    rrule?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    categoryId: string;
    targetAmount: string;
    dueDate: string | null;
    targetDate: string | null;
    rrule?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
}>;
/**
 * Schema defining income sources (e.g. Salary, Wages, Freelance) linked to receiving accounts.
 */
export declare const IncomeSourceSchema: z.ZodObject<{
    id: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    tenantId: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["SALARY", "WAGES", "FREELANCE", "OTHER"]>;
    amount: z.ZodString;
    receivingAccountId: z.ZodNullable<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    type: "SALARY" | "WAGES" | "FREELANCE" | "OTHER";
    amount: string;
    receivingAccountId: string | null;
}, {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    type: "SALARY" | "WAGES" | "FREELANCE" | "OTHER";
    amount: string;
    receivingAccountId: string | null;
}>;
/**
 * Schema for income source recurrence schedules and expected next pay dates.
 */
export declare const IncomeSourceScheduleSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    incomeSourceId: z.ZodString;
    rrule: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodNullable<z.ZodString>;
    occurrenceCount: z.ZodNullable<z.ZodNumber>;
    nextOccurrenceDate: z.ZodNullable<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    rrule: string;
    startDate: string;
    endDate: string | null;
    incomeSourceId: string;
    occurrenceCount: number | null;
    nextOccurrenceDate: string | null;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    rrule: string;
    startDate: string;
    endDate: string | null;
    incomeSourceId: string;
    occurrenceCount: number | null;
    nextOccurrenceDate: string | null;
}>;
/**
 * Schema for concrete expected or confirmed income pay events.
 */
export declare const IncomeEventSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    incomeSourceId: z.ZodString;
    expectedDate: z.ZodString;
    expectedAmount: z.ZodString;
    actualAmount: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["UPCOMING", "PENDING", "CONFIRMED"]>;
}, "strict", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    incomeSourceId: string;
    expectedDate: string;
    expectedAmount: string;
    actualAmount: string | null;
    status: "PENDING" | "UPCOMING" | "CONFIRMED";
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    incomeSourceId: string;
    expectedDate: string;
    expectedAmount: string;
    actualAmount: string | null;
    status: "PENDING" | "UPCOMING" | "CONFIRMED";
}>;
/**
 * Schema defining paycheck cascade allocation plans generated for income events.
 */
export declare const AllocationPlanSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    incomeEventId: z.ZodString;
    status: z.ZodEnum<["PENDING", "CONFIRMED"]>;
    totalIncomeAmount: z.ZodString;
    confirmedAt: z.ZodNullable<z.ZodDate>;
}, "strict", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    status: "PENDING" | "CONFIRMED";
    incomeEventId: string;
    totalIncomeAmount: string;
    confirmedAt: Date | null;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    status: "PENDING" | "CONFIRMED";
    incomeEventId: string;
    totalIncomeAmount: string;
    confirmedAt: Date | null;
}>;
/**
 * Schema for individual category line-items within a paycheck allocation plan.
 */
export declare const AllocationPlanLineSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    planId: z.ZodString;
    categoryId: z.ZodString;
    proposedAmount: z.ZodString;
    confirmedAmount: z.ZodNullable<z.ZodString>;
    reasoning: z.ZodNullable<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    categoryId: string;
    planId: string;
    proposedAmount: string;
    confirmedAmount: string | null;
    reasoning: string | null;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    categoryId: string;
    planId: string;
    proposedAmount: string;
    confirmedAmount: string | null;
    reasoning: string | null;
}>;
/**
 * Schema for double-entry or single-entry transaction ledger events.
 */
export declare const TransactionLedgerSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    appId: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
    archivedAt: z.ZodNullable<z.ZodDate>;
} & {
    categoryId: z.ZodString;
    bankAccountId: z.ZodNullable<z.ZodString>;
    planLineId: z.ZodNullable<z.ZodString>;
    transferGroupId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    flowType: z.ZodEnum<["DEBIT", "CREDIT"]>;
    amount: z.ZodString;
    idempotencyKey: z.ZodString;
    note: z.ZodNullable<z.ZodString>;
    source: z.ZodDefault<z.ZodEnum<["MANUAL", "AUTO", "IMPORT"]>>;
    recordedAt: z.ZodDate;
}, "strict", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    bankAccountId: string | null;
    categoryId: string;
    amount: string;
    note: string | null;
    planLineId: string | null;
    flowType: "DEBIT" | "CREDIT";
    idempotencyKey: string;
    source: "MANUAL" | "AUTO" | "IMPORT";
    recordedAt: Date;
    transferGroupId?: string | null | undefined;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    tenantId: string;
    appId: string;
    bankAccountId: string | null;
    categoryId: string;
    amount: string;
    note: string | null;
    planLineId: string | null;
    flowType: "DEBIT" | "CREDIT";
    idempotencyKey: string;
    recordedAt: Date;
    source?: "MANUAL" | "AUTO" | "IMPORT" | undefined;
    transferGroupId?: string | null | undefined;
}>;
/**
 * Query schema for listing transaction ledger entries with pagination.
 */
export declare const ListTransactionsQuery: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    categoryId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    limit: number;
    offset: number;
    categoryId?: string | undefined;
}, {
    categoryId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
/**
 * Query schema for listing transactions scoped to a specific category.
 */
export declare const ListCategoryTransactionsQuery: z.ZodObject<{
    categoryId: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    categoryId: string;
    limit: number;
    offset: number;
}, {
    categoryId: string;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
/**
 * Input query schema for checking expense affordability ("Can We Afford This?").
 */
export declare const CanAffordQuery: z.ZodObject<{
    amount: z.ZodString;
}, "strict", z.ZodTypeAny, {
    amount: string;
}, {
    amount: string;
}>;
/**
 * Discriminated union DTO defining potential affordability decision outcomes.
 */
export declare const CanAffordVerdictDto: z.ZodDiscriminatedUnion<"verdict", [z.ZodObject<{
    verdict: z.ZodLiteral<"YES">;
    source: z.ZodLiteral<"everyday">;
    everydayRemaining: z.ZodString;
}, "strip", z.ZodTypeAny, {
    source: "everyday";
    verdict: "YES";
    everydayRemaining: string;
}, {
    source: "everyday";
    verdict: "YES";
    everydayRemaining: string;
}>, z.ZodObject<{
    verdict: z.ZodLiteral<"YES_WITH_IMPACT">;
    source: z.ZodLiteral<"savings">;
    affectedBucketName: z.ZodString;
    affectedBucketId: z.ZodString;
    newBalance: z.ZodString;
}, "strip", z.ZodTypeAny, {
    source: "savings";
    verdict: "YES_WITH_IMPACT";
    affectedBucketName: string;
    affectedBucketId: string;
    newBalance: string;
}, {
    source: "savings";
    verdict: "YES_WITH_IMPACT";
    affectedBucketName: string;
    affectedBucketId: string;
    newBalance: string;
}>, z.ZodObject<{
    verdict: z.ZodLiteral<"WAIT">;
    daysUntilNextPaycheck: z.ZodNumber;
    amountExpected: z.ZodString;
}, "strip", z.ZodTypeAny, {
    verdict: "WAIT";
    daysUntilNextPaycheck: number;
    amountExpected: string;
}, {
    verdict: "WAIT";
    daysUntilNextPaycheck: number;
    amountExpected: string;
}>, z.ZodObject<{
    verdict: z.ZodLiteral<"NO">;
    shortfall: z.ZodString;
}, "strip", z.ZodTypeAny, {
    verdict: "NO";
    shortfall: string;
}, {
    verdict: "NO";
    shortfall: string;
}>]>;
/**
 * DTO summarizing monthly income, spending, savings, and remaining everyday cash balance.
 */
export declare const MonthlySummaryDto: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodNumber;
    totalIncome: z.ZodString;
    totalSpent: z.ZodString;
    totalSaved: z.ZodString;
    everydayRemaining: z.ZodString;
}, "strict", z.ZodTypeAny, {
    everydayRemaining: string;
    year: number;
    month: number;
    totalIncome: string;
    totalSpent: string;
    totalSaved: string;
}, {
    everydayRemaining: string;
    year: number;
    month: number;
    totalIncome: string;
    totalSpent: string;
    totalSaved: string;
}>;
/**
 * Command schema to finalize and confirm a paycheck allocation plan.
 */
export declare const ConfirmPlanCommand: z.ZodObject<{
    planId: z.ZodString;
    lines: z.ZodArray<z.ZodObject<{
        lineId: z.ZodString;
        confirmedAmount: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        confirmedAmount: string;
        lineId: string;
    }, {
        confirmedAmount: string;
        lineId: string;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    planId: string;
    lines: {
        confirmedAmount: string;
        lineId: string;
    }[];
}, {
    planId: string;
    lines: {
        confirmedAmount: string;
        lineId: string;
    }[];
}>;
/**
 * Schema for tenant member UI preferences and localization settings.
 */
export declare const UserPreferencesSchema: z.ZodObject<{
    quickActionsCollapsed: z.ZodDefault<z.ZodBoolean>;
    timezone: z.ZodDefault<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    timezone: string;
    quickActionsCollapsed: boolean;
}, {
    timezone?: string | undefined;
    quickActionsCollapsed?: boolean | undefined;
}>;
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
//# sourceMappingURL=index.d.ts.map