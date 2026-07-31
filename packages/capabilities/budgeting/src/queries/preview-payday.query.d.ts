import { PgDatabase } from "drizzle-orm/pg-core";
export declare function previewPaydayQuery(incomeEventId: string, tenantId: string, appId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    incomeEvent: {
        id: string;
        name: string;
        expectedDate: string;
        expectedAmount: string;
        actualAmount: string;
    };
    engineResult: import("../engine/allocation-engine.js").AllocationEngineOutput;
}>;
export declare function previewPaydayForEvent(targetEvent: {
    id: string;
    expectedDate: string;
    expectedAmount: string;
    actualAmount?: string | null;
    name?: string | null;
}, tenantId: string, appId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    incomeEvent: {
        id: string;
        name: string;
        expectedDate: string;
        expectedAmount: string;
        actualAmount: string;
    };
    engineResult: import("../engine/allocation-engine.js").AllocationEngineOutput;
}>;
//# sourceMappingURL=preview-payday.query.d.ts.map