import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { RecordExpenseCommand } from "@money-matters/types";
export declare function recordExpenseCommand(input: z.infer<typeof RecordExpenseCommand>, tenantId: string, appId: string, userId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    archivedBy: string | null;
    tenantId: string;
    appId: string;
    bankAccountId: string | null;
    categoryId: string;
    amount: string;
    note: string | null;
    planLineId: string | null;
    flowType: "DEBIT" | "CREDIT";
    idempotencyKey: string;
    source: "MANUAL" | "AUTO" | "IMPORT";
    transferGroupId: string | null;
    recordedAt: Date;
}>;
//# sourceMappingURL=record-expense.command.d.ts.map