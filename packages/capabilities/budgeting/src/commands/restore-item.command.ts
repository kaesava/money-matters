import { envelopes, incomeSources, incomeEvents, expenseEvents, bankAccounts, tenants, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { generateBurstDates } from "../engine/burst-engine.js";
import { getTenantDateString } from "@money-matters/core";

export async function restoreItemCommand(
  itemId: string,
  itemType: "ENVELOPE" | "INCOME_SOURCE" | "BANK_ACCOUNT",
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  let tenantRecord: { timezone: string | null } | null = null;
  if (typeof (dbClient as any).select === "function") {
    try {
      const q = dbClient.select({ timezone: tenants.timezone }).from(tenants).where(eq(tenants.id, tenantId));
      if (typeof (q as any).limit === "function") {
        const rows = await (q as any).limit(1);
        tenantRecord = rows[0] || null;
      }
    } catch {
      // Mock db safe fallback
    }
  }
  const tenantTz = tenantRecord?.timezone || "Australia/Sydney";
  const getLocalDateString = (d: Date = new Date()) => getTenantDateString(d, { timezone: tenantTz });

  if (itemType === "BANK_ACCOUNT") {
    const [acc] = await dbClient
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, itemId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));
    if (!acc) throw new Error("Bank account not found.");
    if (acc.isPrivate && acc.userId !== userId) {
      throw new Error("Access unauthorized or private account.");
    }
  } else if (itemType === "ENVELOPE") {
    const [env] = await dbClient
      .select({
        isPrivate: envelopes.isPrivate,
        userId: envelopes.userId,
        bankAccountIsPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(envelopes)
      .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
      .where(and(eq(envelopes.id, itemId), eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId)));
    if (!env) throw new Error("Envelope not found.");
    if (env.isPrivate && (env.userId ? env.userId !== userId : env.bankAccountUserId !== userId)) {
      throw new Error("Access unauthorized or private envelope.");
    }
  } else if (itemType === "INCOME_SOURCE") {
    const [inc] = await dbClient
      .select({
        isPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(incomeSources)
      .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
      .where(and(eq(incomeSources.id, itemId), eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));
    if (!inc) throw new Error("Income source not found.");
    if (inc.isPrivate && inc.bankAccountUserId && inc.bankAccountUserId !== userId) {
      throw new Error("Access unauthorized or private income source.");
    }
  }

  let table: typeof envelopes | typeof incomeSources | typeof bankAccounts = envelopes;
  if (itemType === "INCOME_SOURCE") table = incomeSources;
  if (itemType === "BANK_ACCOUNT") table = bankAccounts;

  const [restored] = await dbClient
    .update(table)
    .set({
      archivedAt: null,
      archivedBy: null,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(table.id, itemId),
        eq(table.tenantId, tenantId),
        eq(table.appId, appId)
      )
    )
    .returning();

  if (restored) {
    if (itemType === "INCOME_SOURCE") {
      const inc = restored as typeof incomeSources.$inferSelect;
      const startDate = inc.startDate || getLocalDateString();
      if (inc.rrule) {
        const dates = generateBurstDates(inc.rrule, startDate, inc.endDate, 12);
        if (dates.length > 0) {
          await dbClient.insert(incomeEvents).values(
            dates.map((d) => ({
              incomeSourceId: inc.id,
              expectedDate: getLocalDateString(d),
              expectedAmount: inc.amount,
              status: "PENDING" as const,
              tenantId,
              appId,
              createdBy: userId,
              updatedBy: userId,
            }))
          );
        }
      } else {
        await dbClient.insert(incomeEvents).values({
          incomeSourceId: inc.id,
          expectedDate: startDate,
          expectedAmount: inc.amount,
          status: "PENDING",
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    } else if (itemType === "ENVELOPE") {
      const env = restored as typeof envelopes.$inferSelect;
      const amountVal = env.enteredAmount || env.monthlyAmount || "0.00";
      if (env.envelopeType === "SCHEDULED_BILL" && env.generateEvents !== false && env.rrule && env.startDate && parseFloat(amountVal) > 0) {
        const dates = generateBurstDates(env.rrule, env.startDate, env.endDate, 12);
        if (dates.length > 0) {
          await dbClient.insert(expenseEvents).values(
            dates.map((d) => ({
              envelopeId: env.id,
              name: env.name,
              expectedDate: getLocalDateString(d),
              expectedAmount: amountVal,
              isScheduled: true,
              status: "PENDING" as const,
              tenantId,
              appId,
              createdBy: userId,
              updatedBy: userId,
            }))
          );
        }
      }
    }
  }

  return restored;
}
