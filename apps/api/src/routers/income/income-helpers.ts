import { DbOrTx, tenants } from "@money-matters/db";
import { eq } from "drizzle-orm";
import { getTenantDateString } from '@money-matters/core';

export async function getTenantLocalDateString(db: DbOrTx, tenantId: string, d: Date = new Date()): Promise<string> {
  const [tenantRecord] = typeof (db as any).select === "function"
    ? await db.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId)).limit(1)
    : [null];
  return getTenantDateString(d, { timezone: tenantRecord?.timezone || "Australia/Sydney" });
}

export function buildRRule(frequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY", interval: number = 1): string {
  if (frequency === "WEEKLY") {
    return interval > 1 ? `FREQ=WEEKLY;INTERVAL=${interval}` : "FREQ=WEEKLY";
  }
  if (frequency === "FORTNIGHTLY") {
    return `FREQ=WEEKLY;INTERVAL=${interval * 2}`;
  }
  if (frequency === "ANNUALLY") {
    return interval > 1 ? `FREQ=YEARLY;INTERVAL=${interval}` : "FREQ=YEARLY";
  }
  return interval > 1 ? `FREQ=MONTHLY;INTERVAL=${interval}` : "FREQ=MONTHLY";
}
