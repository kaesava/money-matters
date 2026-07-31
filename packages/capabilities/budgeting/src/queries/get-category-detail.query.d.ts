import { PgDatabase } from "drizzle-orm/pg-core";
export declare function getCategoryDetailQuery(categoryId: string, tenantId: string, appId: string, limit?: number, offset?: number, dbClient?: PgDatabase<any, any, any>): Promise<{
    category: {
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
    transactions: {
        createdAt: Date;
        createdBy: string;
        updatedAt: Date;
        updatedBy: string;
        archivedAt: Date | null;
        archivedBy: string | null;
        tenantId: string;
        appId: string;
        id: string;
        categoryId: string;
        bankAccountId: string | null;
        planLineId: string | null;
        flowType: "DEBIT" | "CREDIT";
        amount: string;
        idempotencyKey: string;
        note: string | null;
        source: "MANUAL" | "AUTO" | "IMPORT";
        transferGroupId: string | null;
        recordedAt: Date;
    }[];
}>;
//# sourceMappingURL=get-category-detail.query.d.ts.map