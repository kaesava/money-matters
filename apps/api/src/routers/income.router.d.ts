export declare const incomeRouter: {
    createIncomeSource: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            amount: string;
            startDate?: string | undefined;
            receivingAccountId?: string | undefined;
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
            rrule: string | null;
            startDate: string | null;
            endDate: string | null;
            amount: string;
            receivingAccountId: string | null;
        };
        meta: object;
    }>;
    updateIncomeSource: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            data: {
                name?: string | undefined;
                startDate?: string | undefined;
                amount?: string | undefined;
                receivingAccountId?: string | undefined;
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
                receivingAccountId: string | null;
                rrule: string | null;
                startDate: string | null;
                endDate: string | null;
            };
            hasConfirmedHistory: boolean;
            unperformedUpdatedCount: number;
        };
        meta: object;
    }>;
    createIncomeEvent: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            incomeSourceId: string;
            expectedDate: string;
            expectedAmount: string;
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
            incomeSourceId: string;
            expectedDate: string;
            expectedAmount: string;
            actualAmount: string | null;
            note: string | null;
            isOverridden: boolean;
            paymentMethod: string | null;
            status: "UPCOMING" | "SKIPPED" | "DRAFT" | "REVIEWED" | "CONFIRMED";
        };
        meta: object;
    }>;
    generateNextIncomeEvents: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            success: boolean;
            generated: number;
        };
        meta: object;
    }>;
    listIncomeSources: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            name: string;
            amount: string;
            receivingAccountId: string | null;
            rrule: string | null;
            startDate: string | null;
            endDate: string | null;
        }[];
        meta: object;
    }>;
    archiveIncomeSource: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            success: boolean;
            deletedUnperformedCount: number;
            hasConfirmedHistory: boolean;
        };
        meta: object;
    }>;
    listIncomeEvents: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            isNextPayday: boolean;
            id: string;
            expectedDate: string;
            expectedAmount: string;
            actualAmount: string | null;
            isOverridden: boolean;
            paymentMethod: string | null;
            status: "UPCOMING" | "SKIPPED" | "DRAFT" | "REVIEWED" | "CONFIRMED";
            note: string | null;
            incomeSourceId: string;
            sourceName: string | null;
        }[];
        meta: object;
    }>;
    createUpcomingIncome: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            amount: string;
            expectedDate: string;
            receivingAccountId?: string | undefined;
            note?: string | undefined;
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
            incomeSourceId: string;
            expectedDate: string;
            expectedAmount: string;
            actualAmount: string | null;
            note: string | null;
            isOverridden: boolean;
            paymentMethod: string | null;
            status: "UPCOMING" | "SKIPPED" | "DRAFT" | "REVIEWED" | "CONFIRMED";
        };
        meta: object;
    }>;
};
//# sourceMappingURL=income.router.d.ts.map