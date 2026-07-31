import { PgDatabase } from "drizzle-orm/pg-core";
export declare function listTransactionsQuery(tenantId: string, appId: string, limit?: number, offset?: number, dbClient?: PgDatabase<any, any, any>, categoryId?: string): Promise<{
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
}[]>;
export declare function listCategoryTransactionsQuery(categoryId: string, tenantId: string, appId: string, limit?: number, offset?: number, dbClient?: PgDatabase<any, any, any>): Promise<{
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
}[]>;
//# sourceMappingURL=list-transactions.query.d.ts.map