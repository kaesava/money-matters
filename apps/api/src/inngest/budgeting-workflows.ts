import { inngest } from "./client.js";
import { db, tenants } from "@money-matters/db";
import { isNull } from "drizzle-orm";
import { maintainRollingWindowCommand } from "@money-matters/capability-budgeting";
import { logger } from "@money-matters/core";
import { MONEY_MATTERS_APP_ID } from "../trpc/edge-context.js";

export const maintainRollingWindowWorkflow = inngest.createFunction(
  { id: "budgeting-maintain-rolling-window" },
  { cron: "0 0 * * *" }, // Daily at midnight UTC
  async ({ step }) => {
    const activeTenants = await step.run("fetch-active-tenants", async () => {
      return await db
        .select({
          tenantId: tenants.id,
          appId: tenants.appId,
          createdBy: tenants.createdBy,
        })
        .from(tenants)
        .where(isNull(tenants.archivedAt));
    });

    let totalNewEvents = 0;
    for (const tenant of activeTenants) {
      await step.run(`sync-tenant-${tenant.tenantId}`, async () => {
        try {
          const res = await maintainRollingWindowCommand({
            db,
            tenantId: tenant.tenantId,
            appId: tenant.appId || MONEY_MATTERS_APP_ID,
            userId: tenant.createdBy,
          });
          totalNewEvents += res.newEventsCount;
        } catch (err) {
          logger.error("[Inngest] Failed to maintain rolling window for tenant", {
            tenantId: tenant.tenantId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    }

    return {
      success: true,
      tenantsProcessed: activeTenants.length,
      totalNewEvents,
    };
  }
);
