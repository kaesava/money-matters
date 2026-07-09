import { inngest } from "./client";
import { db } from "@money-matters/db";
import { households } from "@money-matters/db/src/schema/household";
import { randomUUID } from "crypto";
import { eq } from 'drizzle-orm';

export const handleUserSignup = inngest.createFunction(
  { id: "handle-user-signup" },
  { event: "neon/user.created" },
  async ({ event, step }) => {
    // 1. Provision the tenant record safely with idempotency logic
    const tenantData = await step.run("provision-tenant", async () => {
       const existingTenant = await db.query.households.findFirst({
           where: (h) => eq(h.id, event.data.id)
       })

       if (existingTenant) {
           return existingTenant
       }

       const [newTenant] = await db.insert(households).values({
           id: event.data.id,
           fyEndMonthDay: "06-30",
           appId: event.data.app_metadata.appId || randomUUID(), // Assume appId might come from metadata
           createdBy: event.data.id,
           updatedBy: event.data.id
       }).returning()
       
       return newTenant
    });

    // 2. Base Data Seeding Engine: Inject Moneysmart categories (to be implemented)
    // await step.run("seed-moneysmart-categories", async () => { ... })

    return { tenantId: tenantData.id, status: "provisioned" };
  }
);
