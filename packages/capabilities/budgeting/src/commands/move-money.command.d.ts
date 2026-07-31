import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
import { MoveMoneyCommand } from "@money-matters/types";
export declare function moveMoneyCommand(input: z.infer<typeof MoveMoneyCommand>, tenantId: string, appId: string, userId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=move-money.command.d.ts.map