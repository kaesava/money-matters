export declare const transactionsRouter: {
    recordExpense: import("@trpc/server").TRPCMutationProcedure<{
        input: {
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
            bankAccountId: string | null;
            categoryId: string;
            amount: string;
            note: string | null;
            planLineId: string | null;
            flowType: "DEBIT" | "CREDIT";
            idempotencyKey: string;
            source: "MANUAL" | "AUTO" | "IMPORT";
            transferGroupId: string | null;
            recordedAt: Date;
        };
        meta: object;
    }>;
    listTransactions: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            categoryId?: string | undefined;
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: {
            id: string;
            categoryId: string;
            bankAccountId: string | null;
            planLineId: string | null;
            transferGroupId: string | null;
            flowType: "DEBIT" | "CREDIT";
            amount: string;
            note: string | null;
            source: "MANUAL" | "AUTO" | "IMPORT";
            recordedAt: Date;
            categoryName: string | null;
        }[];
        meta: object;
    }>;
    listCategoryTransactions: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            categoryId: string;
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: {
            id: string;
            categoryId: string;
            bankAccountId: string | null;
            planLineId: string | null;
            flowType: "DEBIT" | "CREDIT";
            amount: string;
            note: string | null;
            source: "MANUAL" | "AUTO" | "IMPORT";
            recordedAt: Date;
            categoryName: string | null;
        }[];
        meta: object;
    }>;
    canAfford: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            amount: string;
        };
        output: {
            source: "everyday";
            verdict: "YES";
            everydayRemaining: string;
        } | {
            source: "savings";
            verdict: "YES_WITH_IMPACT";
            affectedBucketName: string;
            affectedBucketId: string;
            newBalance: string;
        } | {
            verdict: "WAIT";
            daysUntilNextPaycheck: number;
            amountExpected: string;
        } | {
            verdict: "NO";
            shortfall: string;
        };
        meta: object;
    }>;
};
//# sourceMappingURL=transactions.router.d.ts.map