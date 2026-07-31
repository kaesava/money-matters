import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { CreateCategoryCommand } from "@money-matters/types";
export declare function createCategoryCommand(input: z.infer<typeof CreateCategoryCommand>, tenantId: string, appId: string, userId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
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
}>;
//# sourceMappingURL=create-category.command.d.ts.map