import { PgDatabase } from "drizzle-orm/pg-core";
export declare function getMonthlySummaryQuery(year: number, month: number, tenantId: string, appId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    year: number;
    month: number;
    totalIncome: string;
    totalSpent: string;
    totalSaved: string;
    everydayRemaining: string;
}>;
//# sourceMappingURL=get-monthly-summary.query.d.ts.map