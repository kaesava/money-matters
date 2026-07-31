import { PgDatabase } from "drizzle-orm/pg-core";
export declare function runAllocationCommand(tenantId: string, appId: string, userId: string, incomeEventId: string, incomeAmount: number, dbClient?: PgDatabase<any, any, any>, customLines?: {
    bucketId: string;
    amount: string;
}[], markAsReceivedToday?: boolean): Promise<{
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
}>;
//# sourceMappingURL=run-allocation.command.d.ts.map