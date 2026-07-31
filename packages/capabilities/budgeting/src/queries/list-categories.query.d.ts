import { PgDatabase } from "drizzle-orm/pg-core";
export declare function listCategoriesQuery(tenantId: string, appId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
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
}[]>;
//# sourceMappingURL=list-categories.query.d.ts.map