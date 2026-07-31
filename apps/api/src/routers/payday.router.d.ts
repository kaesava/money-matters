export declare const paydayRouter: {
    previewPayday: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            incomeEventId: string;
        };
        output: {
            incomeEvent: {
                id: string;
                name: string;
                expectedDate: string;
                expectedAmount: string;
                actualAmount: string;
            };
            engineResult: import("@money-matters/capability-budgeting").AllocationEngineOutput;
        };
        meta: object;
    }>;
    confirmPayday: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            actualAmount: string;
            incomeEventId: string;
            lines: {
                amount: string;
                bucketId: string;
            }[];
            markAsReceivedToday?: boolean | undefined;
        };
        output: {
            isFuturePlanned: boolean;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            archivedAt: Date | null;
            createdBy: string;
            updatedBy: string;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            status: "PENDING" | "CONFIRMED";
            incomeEventId: string;
            totalIncomeAmount: string;
            confirmedAt: Date | null;
        };
        meta: object;
    }>;
    overrideEvent: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            amount: string;
            expectedDate: string;
            eventId: string;
            eventType: "INCOME" | "EXPENSE";
            name?: string | undefined;
            categoryId?: string | undefined;
            note?: string | undefined;
            updateSeries?: boolean | undefined;
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
            incomeSourceId: string;
            expectedDate: string;
            expectedAmount: string;
            actualAmount: string | null;
            note: string | null;
            isOverridden: boolean;
            paymentMethod: string | null;
            status: "UPCOMING" | "SKIPPED" | "DRAFT" | "REVIEWED" | "CONFIRMED";
        } | {
            createdAt: Date;
            createdBy: string;
            updatedAt: Date;
            updatedBy: string;
            archivedAt: Date | null;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            id: string;
            expenseSourceId: string | null;
            categoryId: string | null;
            name: string;
            expectedDate: string;
            expectedAmount: string;
            actualAmount: string | null;
            note: string | null;
            isOverridden: boolean;
            paymentMethod: string | null;
            status: "UPCOMING" | "SKIPPED" | "PAID" | "CANCELLED";
        };
        meta: object;
    }>;
    deleteUpcomingEvent: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            eventId: string;
            eventType: "INCOME" | "EXPENSE";
        };
        output: {
            success: boolean;
            id: string;
        };
        meta: object;
    }>;
    bulkDeleteEvents: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            incomeEventIds?: string[] | undefined;
            expenseEventIds?: string[] | undefined;
        };
        output: {
            success: boolean;
            incomeDeletedCount: number;
            expenseDeletedCount: number;
            totalDeleted: number;
        };
        meta: object;
    }>;
    listAllocationPlan: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            incomeEventId: string;
        };
        output: {
            lines: {
                categoryName: string;
                id: string;
                categoryId: string;
                proposedAmount: string;
                confirmedAmount: string | null;
                reasoning: string | null;
            }[];
            createdAt: Date;
            createdBy: string;
            updatedAt: Date;
            updatedBy: string;
            archivedAt: Date | null;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            id: string;
            incomeEventId: string;
            status: "PENDING" | "CONFIRMED";
            totalIncomeAmount: string;
            confirmedAt: Date | null;
        } | null;
        meta: object;
    }>;
    runAllocation: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            incomeEventId: string;
            incomeAmount: number;
        };
        output: {
            isFuturePlanned: boolean;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            archivedAt: Date | null;
            createdBy: string;
            updatedBy: string;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            status: "PENDING" | "CONFIRMED";
            incomeEventId: string;
            totalIncomeAmount: string;
            confirmedAt: Date | null;
        };
        meta: object;
    }>;
    previewAllocation: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            incomeEventId: string;
            incomeAmount: number;
        };
        output: {
            categoryId: string;
            categoryName: string;
            type: "REGULAR" | "GOAL" | "EVERYDAY";
            currentBalance: string;
            targetAmount: string | null;
            progressPercentage: number;
            proposedAmount: number;
            reasoning: string;
        }[];
        meta: object;
    }>;
    confirmAllocation: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            incomeEventId: string;
            lines: {
                categoryId: string;
                confirmedAmount: string;
                reasoning?: string | undefined;
            }[];
            incomeAmount: number;
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
            status: "PENDING" | "CONFIRMED";
            incomeEventId: string;
            totalIncomeAmount: string;
            confirmedAt: Date | null;
        };
        meta: object;
    }>;
};
//# sourceMappingURL=payday.router.d.ts.map