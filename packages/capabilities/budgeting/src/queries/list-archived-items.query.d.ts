import { PgDatabase } from "drizzle-orm/pg-core";
export declare function listArchivedItemsQuery(tenantId: string, appId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    id: string;
    name: string;
    itemType: string;
    subtitle: string;
    archivedAt: Date | null;
}[]>;
//# sourceMappingURL=list-archived-items.query.d.ts.map