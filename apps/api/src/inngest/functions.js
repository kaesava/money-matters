"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUserSignup = void 0;
const client_1 = require("./client");
const db_1 = require("@money-matters/db");
const household_1 = require("@money-matters/db/src/schema/household");
const crypto_1 = require("crypto");
exports.handleUserSignup = client_1.inngest.createFunction({ id: "handle-user-signup" }, { event: "neon/user.created" }, async ({ event, step }) => {
    // 1. Provision the tenant record safely with idempotency logic
    const tenantData = await step.run("provision-tenant", async () => {
        const existingTenant = await db_1.db.query.households.findFirst({
            where: (h, { eq }) => eq(h.id, event.data.id)
        });
        if (existingTenant) {
            return existingTenant;
        }
        const [newTenant] = await db_1.db.insert(household_1.households).values({
            id: event.data.id,
            fyEndMonthDay: "06-30",
            appId: event.data.app_metadata.appId || (0, crypto_1.randomUUID)(), // Assume appId might come from metadata
            createdBy: event.data.id,
            updatedBy: event.data.id
        }).returning();
        return newTenant;
    });
    // 2. Base Data Seeding Engine: Inject Moneysmart categories (to be implemented)
    // await step.run("seed-moneysmart-categories", async () => { ... })
    return { tenantId: tenantData.id, status: "provisioned" };
});
//# sourceMappingURL=functions.js.map