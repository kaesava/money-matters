export declare const expensesRouter: {
    listExpenseSources: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            name: string;
            amount: string;
            categoryId: string;
            categoryName: string | null;
            rrule: string | null;
            startDate: string | null;
            endDate: string | null;
        }[];
        meta: object;
    }>;
    createExpenseSource: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            categoryId: string;
            amount: string;
            startDate?: string | undefined;
            isRecurring?: boolean | undefined;
            frequency?: "MONTHLY" | "FORTNIGHTLY" | "ANNUALLY" | "WEEKLY" | undefined;
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
            categoryId: string;
            rrule: string | null;
            startDate: string | null;
            endDate: string | null;
            amount: string;
        };
        meta: object;
    }>;
    updateExpenseSource: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            data: {
                name?: string | undefined;
                categoryId?: string | undefined;
                startDate?: string | undefined;
                amount?: string | undefined;
                isRecurring?: boolean | undefined;
                frequency?: "MONTHLY" | "FORTNIGHTLY" | "ANNUALLY" | "WEEKLY" | undefined;
            };
        };
        output: {
            updated: {
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
                amount: string;
                categoryId: string;
                rrule: string | null;
                startDate: string | null;
                endDate: string | null;
            };
            hasPaidHistory: boolean;
            unperformedUpdatedCount: number;
        };
        meta: object;
    }>;
    archiveExpenseSource: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            success: boolean;
            deletedUnperformedCount: number;
            hasPaidHistory: boolean;
        };
        meta: object;
    }>;
    listExpenseEvents: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            name: string;
            expectedDate: string;
            expectedAmount: string;
            actualAmount: string | null;
            isOverridden: boolean;
            paymentMethod: string | null;
            note: string | null;
            status: "UPCOMING" | "SKIPPED" | "PAID" | "CANCELLED";
            categoryId: string | null;
            categoryName: string | null;
            expenseSourceId: string | null;
        }[];
        meta: object;
    }>;
    createExpenseEvent: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            expectedDate: string;
            expectedAmount: string;
            categoryId?: string | undefined;
            note?: string | undefined;
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
            categoryId: string | null;
            expectedDate: string;
            expectedAmount: string;
            actualAmount: string | null;
            note: string | null;
            isOverridden: boolean;
            paymentMethod: string | null;
            status: "UPCOMING" | "SKIPPED" | "PAID" | "CANCELLED";
            expenseSourceId: string | null;
        };
        meta: object;
    }>;
    markExpensePaid: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            eventId: string;
            actualAmount?: string | undefined;
            note?: string | undefined;
            recordedAt?: string | undefined;
        };
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
    createUpcomingExpense: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            categoryId: string;
            amount: string;
            expectedDate: string;
            note?: string | undefined;
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
            categoryId: string | null;
            expectedDate: string;
            expectedAmount: string;
            actualAmount: string | null;
            note: string | null;
            isOverridden: boolean;
            paymentMethod: string | null;
            status: "UPCOMING" | "SKIPPED" | "PAID" | "CANCELLED";
            expenseSourceId: string | null;
        };
        meta: object;
    }>;
};
//# sourceMappingURL=expenses.router.d.ts.map