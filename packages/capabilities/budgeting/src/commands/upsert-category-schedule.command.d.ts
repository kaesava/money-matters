import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { CreateCategoryScheduleCommand } from "@money-matters/types";
export declare function upsertCategoryScheduleCommand(input: z.infer<typeof CreateCategoryScheduleCommand>, tenantId: string, appId: string, userId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    archivedBy: string | null;
    tenantId: string;
    appId: string;
    categoryId: string;
    targetAmount: string;
    dueDate: string | null;
    targetDate: string | null;
    rrule: string | null;
    startDate: string | null;
    endDate: string | null;
}>;
//# sourceMappingURL=upsert-category-schedule.command.d.ts.map