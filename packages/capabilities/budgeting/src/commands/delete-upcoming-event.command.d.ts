import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { DeleteUpcomingEventCommand } from "@money-matters/types";
export declare function deleteUpcomingEventCommand(input: z.infer<typeof DeleteUpcomingEventCommand>, tenantId: string, appId: string, userId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    success: boolean;
    id: string;
}>;
//# sourceMappingURL=delete-upcoming-event.command.d.ts.map