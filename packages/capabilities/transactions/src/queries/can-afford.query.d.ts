import { PgDatabase } from "drizzle-orm/pg-core";
import { CanAffordVerdictType } from "@money-matters/types";
export declare function canAffordQuery(amount: number, tenantId: string, appId: string, dbClient?: PgDatabase<any, any, any>): Promise<CanAffordVerdictType>;
//# sourceMappingURL=can-afford.query.d.ts.map