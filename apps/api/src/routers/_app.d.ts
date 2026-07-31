export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc/context.js").Context;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    listFileNotes: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            entityType: string;
            entityId: string;
            status?: "ACTIVE" | "ARCHIVED" | "ALL" | undefined;
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
            entityType: string;
            entityId: string;
            comment: string | null;
            fileKey: string | null;
            fileName: string | null;
            fileMimeType: string | null;
            fileSize: string | null;
        }[];
        meta: object;
    }>;
    getFileNoteDownloadUrl: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            downloadUrl: string;
        };
        meta: object;
    }>;
    createPreSignedUploadUrl: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            entityType: string;
            entityId: string;
            fileName: string;
            fileMimeType: string;
            fileSize: number;
        };
        output: {
            fileKey: string;
            uploadUrl: string;
        };
        meta: object;
    }>;
    createFileNote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            entityType: string;
            entityId: string;
            comment?: string | undefined;
            attachment?: {
                fileKey: string;
                fileName: string;
                fileMimeType: string;
                fileSize: number;
            } | undefined;
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
            entityType: string;
            entityId: string;
            comment: string | null;
            fileKey: string | null;
            fileName: string | null;
            fileMimeType: string | null;
            fileSize: string | null;
        };
        meta: object;
    }>;
    updateFileNoteComment: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            comment: string;
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
            entityType: string;
            entityId: string;
            comment: string | null;
            fileKey: string | null;
            fileName: string | null;
            fileMimeType: string | null;
            fileSize: string | null;
        };
        meta: object;
    }>;
    archiveFileNote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            success: boolean;
            archived: {
                createdAt: Date;
                createdBy: string;
                updatedAt: Date;
                updatedBy: string;
                archivedAt: Date | null;
                archivedBy: string | null;
                tenantId: string;
                appId: string;
                id: string;
                entityType: string;
                entityId: string;
                comment: string | null;
                fileKey: string | null;
                fileName: string | null;
                fileMimeType: string | null;
                fileSize: string | null;
            };
        };
        meta: object;
    }>;
    restoreFileNote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            success: boolean;
            restored: {
                createdAt: Date;
                createdBy: string;
                updatedAt: Date;
                updatedBy: string;
                archivedAt: Date | null;
                archivedBy: string | null;
                tenantId: string;
                appId: string;
                id: string;
                entityType: string;
                entityId: string;
                comment: string | null;
                fileKey: string | null;
                fileName: string | null;
                fileMimeType: string | null;
                fileSize: string | null;
            };
        };
        meta: object;
    }>;
    purgeFileNote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            success: boolean;
            purgedId: string;
        };
        meta: object;
    }>;
    registerToken: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            platform: "ios" | "web" | "android";
            token: string;
        };
        output: {
            id: string;
            action: "updated";
        } | {
            id: string;
            action: "created";
        };
        meta: object;
    }>;
    removeToken: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            platform: "ios" | "web" | "android";
        };
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
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
    invitePartner: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            email: string;
        };
        output: {
            success: boolean;
            inviteToken: string | null;
            inviteEmail: string | null;
        };
        meta: object;
    }>;
    acceptInvite: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            inviteToken: string;
        };
        output: {
            success: boolean;
            tenantId: string;
            role: "OWNER" | "MEMBER";
        };
        meta: object;
    }>;
    createTenant: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
        };
        output: {
            success: boolean;
            tenantId: string;
        };
        meta: object;
    }>;
    getTenantStatus: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            hasTenant: boolean;
            tenantId: string;
        };
        meta: object;
    }>;
    getTenant: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            users: {
                createdAt: Date;
                createdBy: string;
                updatedAt: Date;
                updatedBy: string;
                archivedAt: Date | null;
                archivedBy: string | null;
                id: string;
                tenantId: string;
                userId: string | null;
                inviteEmail: string | null;
                role: "OWNER" | "MEMBER";
                inviteToken: string | null;
                inviteStatus: "PENDING" | "ACCEPTED" | "REVOKED";
                invitedAt: Date | null;
                appId: string;
            }[];
            bankAccounts: {
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
                lastKnownBalance: string;
                unbudgetedBuffer: string;
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
            name: string;
            fyEndMonthDay: string;
            premiumEnabled: boolean;
        } | null;
        meta: object;
    }>;
    getUserPreferences: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            quickActionsCollapsed: boolean;
            timezone: string;
            paydayAlertsEnabled: boolean;
            shortfallAlertsEnabled: boolean;
            billRemindersEnabled: boolean;
            weeklyDigestEnabled: boolean;
            id: string;
            userId: string;
            tenantId: string;
            appPreferences: Record<string, import("@money-matters/db").AppPreferencesBlob>;
            createdAt: Date;
            updatedAt: Date;
        };
        meta: object;
    }>;
    updateUserPreferences: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            timezone?: string | undefined;
            paydayAlertsEnabled?: boolean | undefined;
            shortfallAlertsEnabled?: boolean | undefined;
            billRemindersEnabled?: boolean | undefined;
            weeklyDigestEnabled?: boolean | undefined;
            quickActionsCollapsed?: boolean | undefined;
        };
        output: {
            quickActionsCollapsed: boolean;
            id: string;
            userId: string;
            tenantId: string;
            timezone: string;
            paydayAlertsEnabled: boolean;
            shortfallAlertsEnabled: boolean;
            billRemindersEnabled: boolean;
            weeklyDigestEnabled: boolean;
            appPreferences: Record<string, import("@money-matters/db").AppPreferencesBlob>;
            createdAt: Date;
            updatedAt: Date;
        };
        meta: object;
    }>;
    createBankAccount: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            lastKnownBalance?: string | undefined;
            unbudgetedBuffer?: string | undefined;
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
            lastKnownBalance: string;
            unbudgetedBuffer: string;
        };
        meta: object;
    }>;
    updateBankAccount: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            data: {
                name?: string | undefined;
                lastKnownBalance?: string | undefined;
                unbudgetedBuffer?: string | undefined;
            };
            accountId: string;
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
            lastKnownBalance: string;
            unbudgetedBuffer: string;
        };
        meta: object;
    }>;
    archiveBankAccount: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            accountId: string;
        };
        output: {
            success: boolean;
        };
        meta: object;
    }>;
    listBankAccounts: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
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
            lastKnownBalance: string;
            unbudgetedBuffer: string;
        }[];
        meta: object;
    }>;
    listBankAccountsWithExpected: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            expectedBalance: string;
            linkedCategoryCount: number;
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
            lastKnownBalance: string;
            unbudgetedBuffer: string;
        }[];
        meta: object;
    }>;
    reconcileBankBalance: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            accountId: string;
            actualBalance: string;
            targetCategoryId?: string | undefined;
            drawdowns?: {
                categoryId: string;
                amount: string;
            }[] | undefined;
        };
        output: {
            success: boolean;
            diff: number;
        };
        meta: object;
    }>;
}>>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=_app.d.ts.map