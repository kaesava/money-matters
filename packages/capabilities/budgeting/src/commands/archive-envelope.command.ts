import { envelopes, expenseEvents, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export async function archiveEnvelopeCommand(
  envelopeId: string,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  const [envelope] = await dbClient
    .select({
      id: envelopes.id,
      envelopeType: envelopes.envelopeType,
      isSurplusTarget: envelopes.isSurplusTarget,
      isPrivate: envelopes.isPrivate,
      userId: envelopes.userId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(envelopes.id, envelopeId),
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId)
      )
    );

  if (!envelope) throw new Error("Envelope not found.");

  if (
    (envelope.isPrivate && envelope.userId !== userId) ||
    (envelope.bankAccountIsPrivate && envelope.bankAccountUserId !== userId)
  ) {
    throw new Error("Envelope not found.");
  }

  if (envelope.envelopeType === "EVERYDAY") {
    throw new Error("The Everyday envelope cannot be archived.");
  }

  if (envelope.isSurplusTarget) {
    throw new Error("Cannot archive an envelope designated as the household Surplus Sweep Target. Please designate another envelope as the Surplus Sweep Target first.");
  }

  // Hard-delete all pending (unconfirmed) expense events (both scheduled and one-off)
  // Confirmed history and bank accounts are never modified or archived.
  await dbClient
    .delete(expenseEvents)
    .where(
      and(
        eq(expenseEvents.envelopeId, envelopeId),
        eq(expenseEvents.status, "PENDING"),
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId)
      )
    );

  const [archived] = await dbClient
    .update(envelopes)
    .set({
      archivedAt: new Date(),
      archivedBy: userId,
      lastBurstDate: null,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(envelopes.id, envelopeId),
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId)
      )
    )
    .returning();

  if (envelope.isPrivate || envelope.bankAccountIsPrivate) {
    const { resetContributionsIfNoPrivateEnvelopes } = await import("./reset-contributions-if-no-private.js");
    await resetContributionsIfNoPrivateEnvelopes(tenantId, appId, userId, dbClient);
  }

  return archived;
}
