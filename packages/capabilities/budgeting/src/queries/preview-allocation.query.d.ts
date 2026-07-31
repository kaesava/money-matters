import { PgDatabase } from "drizzle-orm/pg-core";
export declare function previewAllocationQuery(tenantId: string, appId: string, incomeEventId: string, incomeAmount: number, dbClient?: PgDatabase<any, any, any>): Promise<{
    categoryId: string;
    categoryName: string;
    type: "REGULAR" | "GOAL" | "EVERYDAY";
    currentBalance: string;
    targetAmount: string | null;
    progressPercentage: number;
    proposedAmount: number;
    reasoning: string;
}[]>;
//# sourceMappingURL=preview-allocation.query.d.ts.map