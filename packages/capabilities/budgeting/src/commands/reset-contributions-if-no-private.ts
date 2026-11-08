import { envelopes, bankAccounts, incomeSources, incomeEvents, DbOrTx } from "@money-matters/db";
import { eq, and, sql, or } from "drizzle-orm";

export async function resetContributionsIfNoPrivateEnvelopes(
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  // Query remaining active private envelopes for this user
  const activePrivateEnvelopes = await dbClient
    .select({ id: envelopes.id })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`,
        or(
          and(eq(envelopes.isPrivate, true), eq(envelopes.userId, userId)),
          and(eq(bankAccounts.isPrivate, true), eq(bankAccounts.userId, userId))
        )
      )
    );

  if (activePrivateEnvelopes.length === 0) {
    // 1. Reset active income schedules to 100% household contribution
    await dbClient
      .update(incomeSources)
      .set({
        contributionMode: "FULL",
        contributionValue: null,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(incomeSources.tenantId, tenantId),
          eq(incomeSources.appId, appId),
          sql`${incomeSources.archivedAt} IS NULL`
        )
      );

    // 2. Reset unconfirmed upcoming/burst income events to 100% household contribution
    await dbClient
      .update(incomeEvents)
      .set({
        contributionMode: "FULL",
        contributionValue: null,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(incomeEvents.tenantId, tenantId),
          eq(incomeEvents.appId, appId),
          sql`${incomeEvents.status} != 'CONFIRMED'`,
          sql`${incomeEvents.archivedAt} IS NULL`
        )
      );
  }
}
