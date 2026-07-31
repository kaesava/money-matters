import { Pool } from "@neondatabase/serverless";
export declare function createDbClient(connectionString: string): import("drizzle-orm/neon-serverless").NeonDatabase<Record<string, never>> & {
    $client: Pool;
};
//# sourceMappingURL=db-client.d.ts.map