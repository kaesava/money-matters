import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { UpdateCategoryCommand } from "@money-matters/types";
export declare function updateCategoryCommand(categoryId: string, input: z.infer<typeof UpdateCategoryCommand>, tenantId: string, appId: string, userId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
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
}>;
//# sourceMappingURL=update-category.command.d.ts.map