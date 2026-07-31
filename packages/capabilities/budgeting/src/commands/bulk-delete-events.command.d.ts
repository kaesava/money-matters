import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { BulkDeleteEventsCommand } from "@money-matters/types";
export declare function bulkDeleteEventsCommand(input: z.infer<typeof BulkDeleteEventsCommand>, tenantId: string, appId: string, userId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    success: boolean;
    incomeDeletedCount: number;
    expenseDeletedCount: number;
    totalDeleted: number;
}>;
//# sourceMappingURL=bulk-delete-events.command.d.ts.map