export declare const categoriesRouter: {
    createCategory: import("@trpc/server").TRPCMutationProcedure<{
        input: {
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
        };
        output: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            archivedAt: Date | null;
            createdBy: string;
            updatedBy: string;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            type: "REGULAR" | "GOAL" | "EVERYDAY";
            isCommitted: boolean;
            monthlyAmount: string | null;
            everydayAllowanceAmount: string | null;
            isDefaultExcess: boolean;
            rolloverRule: "ROLLOVER" | "SWEEP" | "RESET";
            isDefaultSavings: boolean;
            icon: string | null;
            colour: string | null;
            budgetFrequency: string | null;
            bankAccountId: string | null;
            lastNotifiedAt: Date | null;
        };
        meta: object;
    }>;
    updateCategory: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            data: {
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
            };
            categoryId: string;
        };
        output: {
            createdAt: Date;
            createdBy: string;
            updatedAt: Date;
            updatedBy: string;
            archivedAt: Date | null;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            id: string;
            name: string;
            type: "REGULAR" | "GOAL" | "EVERYDAY";
            isCommitted: boolean;
            monthlyAmount: string | null;
            everydayAllowanceAmount: string | null;
            isDefaultExcess: boolean;
            rolloverRule: "ROLLOVER" | "SWEEP" | "RESET";
            isDefaultSavings: boolean;
            icon: string | null;
            colour: string | null;
            budgetFrequency: string | null;
            bankAccountId: string | null;
            lastNotifiedAt: Date | null;
        };
        meta: object;
    }>;
    createCategorySchedule: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            categoryId: string;
            targetAmount: string;
            dueDate?: string | undefined;
            targetDate?: string | undefined;
            rrule?: string | undefined;
            startDate?: string | undefined;
            endDate?: string | undefined;
        };
        output: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            archivedAt: Date | null;
            createdBy: string;
            updatedBy: string;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            categoryId: string;
            targetAmount: string;
            dueDate: string | null;
            targetDate: string | null;
            rrule: string | null;
            startDate: string | null;
            endDate: string | null;
        };
        meta: object;
    }>;
    archiveCategory: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            categoryId: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    moveMoney: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            amount: string;
            sourceCategoryId: string;
            destinationCategoryId: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    listArchivedItems: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            name: string;
            itemType: string;
            subtitle: string;
            archivedAt: Date | null;
        }[];
        meta: object;
    }>;
    restoreItem: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            itemType: "CATEGORY" | "INCOME_SOURCE" | "BANK_ACCOUNT";
            itemId: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    listCategories: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            name: string;
            type: "REGULAR" | "GOAL" | "EVERYDAY";
            isCommitted: boolean;
            isDefaultExcess: boolean;
            rolloverRule: any;
            isDefaultSavings: any;
            everydayTargetKeepAmount: any;
            everydaySweepFrequency: any;
            everydayAllowanceAmount: any;
            monthlyAmount: string | null;
            icon: string | null;
            colour: string | null;
            bankAccountId: string | null;
            currentBalance: string;
            targetAmount: string | null;
            targetDate: string | null;
            rrule: any;
            startDate: any;
            endDate: any;
            progressPercentage: number;
            healthStatus: "GREEN" | "AMBER" | "RED";
        }[];
        meta: object;
    }>;
    getMonthlySummary: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            year: number;
            month: number;
        };
        output: {
            year: number;
            month: number;
            totalIncome: string;
            totalSpent: string;
            totalSaved: string;
            everydayRemaining: string;
        };
        meta: object;
    }>;
};
//# sourceMappingURL=categories.router.d.ts.map