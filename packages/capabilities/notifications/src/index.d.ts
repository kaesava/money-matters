import { PgDatabase } from "drizzle-orm/pg-core";
export declare function registerDeviceTokenHandler(db: PgDatabase<any, any, any>): (input: {
    platform: "ios" | "android" | "web";
    token: string;
}, tenantId: string, appId: string, userId: string) => Promise<{
    id: string;
    action: "updated";
} | {
    id: string;
    action: "created";
}>;
export declare function removeDeviceTokenHandler(db: PgDatabase<any, any, any>): (input: {
    platform: "ios" | "android" | "web";
}, tenantId: string, userId: string) => Promise<{
    success: boolean;
    message: string;
}>;
export * from "./email.js";
export * from "./inngest.js";
export * from "./scheduled-notifications.js";
//# sourceMappingURL=index.d.ts.map