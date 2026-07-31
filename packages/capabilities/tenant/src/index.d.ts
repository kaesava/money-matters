/**
 * Capability Tenant & Bank Account Management
 *
 * Provides command handlers for tenant creation, user membership binding, bank account management,
 * and tenant configuration queries.
 */
import { z } from "zod";
import { CreateTenantCommand, CreateBankAccountCommand, UpdateBankAccountCommand } from "@money-matters/types";
import { PgDatabase } from "drizzle-orm/pg-core";
/**
 * Creates a new tenant scope and assigns the creator user as OWNER.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Command execution handler function
 */
export declare function createTenantHandler(db: PgDatabase<any, any, any>): (input: z.infer<typeof CreateTenantCommand>, appId: string, userId: string) => Promise<{
    success: boolean;
    tenantId: string;
}>;
/**
 * Invites a partner to join the household tenant.
 */
export declare function invitePartnerHandler(db: PgDatabase<any, any, any>): (input: {
    email: string;
}, tenantId: string, appId: string, userId: string) => Promise<{
    success: boolean;
    inviteToken: string | null;
    inviteEmail: string | null;
}>;
/**
 * Accepts a household partner invitation.
 */
export declare function acceptInviteHandler(db: PgDatabase<any, any, any>): (input: {
    inviteToken: string;
}, userId: string) => Promise<{
    success: boolean;
    tenantId: string;
    role: "OWNER" | "MEMBER";
}>;
/**
 * Creates a new bank account within the tenant scope.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Command handler creating bank account records
 */
export declare function createBankAccountHandler(db: PgDatabase<any, any, any>): (input: z.infer<typeof CreateBankAccountCommand>, tenantId: string, appId: string, userId: string) => Promise<{
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
}>;
/**
 * Updates an existing bank account within the tenant scope.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Command handler updating bank account parameters
 */
export declare function updateBankAccountHandler(db: PgDatabase<any, any, any>): (accountId: string, input: z.infer<typeof UpdateBankAccountCommand>, tenantId: string, appId: string, userId: string) => Promise<{
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
}>;
/**
 * Archives a bank account within the tenant scope after ensuring no linked categories exist.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Command handler performing soft-delete archiving
 */
export declare function archiveBankAccountHandler(db: PgDatabase<any, any, any>): (accountId: string, tenantId: string, appId: string, userId: string) => Promise<{
    success: boolean;
}>;
/**
 * Fetches tenant details, member users, and active bank accounts.
 *
 * @param db - Drizzle PostgreSQL database client
 * @returns Query handler returning aggregated tenant object
 */
export declare function getTenantHandler(db: PgDatabase<any, any, any>): (tenantId: string, appId: string) => Promise<{
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
} | null>;
//# sourceMappingURL=index.d.ts.map