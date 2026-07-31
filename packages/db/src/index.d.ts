import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema/index.js";
export declare const db: import("drizzle-orm/neon-serverless/driver.js").NeonDatabase<typeof schema> & {
    $client: Pool;
};
export * from "./schema/index.js";
//# sourceMappingURL=index.d.ts.map