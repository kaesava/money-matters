import { AppPreferencesBlob } from "@money-matters/db";
export declare const tenantRouter: {
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
            appPreferences: Record<string, AppPreferencesBlob>;
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
            appPreferences: Record<string, AppPreferencesBlob>;
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
};
//# sourceMappingURL=tenant.router.d.ts.map