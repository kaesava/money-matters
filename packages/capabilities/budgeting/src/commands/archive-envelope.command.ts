import { envelopes, expenseEvents, DbOrTx } from "@money-matters/db";
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
    })
    .from(envelopes)
    .where(
      and(
        eq(envelopes.id, envelopeId),
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId)
      )
    );

  if (!envelope) throw new Error("Envelope not found.");
  if (envelope.envelopeType === "EVERYDAY") {
    throw new Error("The Everyday envelope cannot be archived.");
  }

  // Guard surplus target designation: cannot archive if it is the only active public surplus target
  if (envelope.isSurplusTarget) {
    const otherSurplusTargets = await dbClient
      .select({ id: envelopes.id })
      .from(envelopes)
      .where(
        and(
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId),
          eq(envelopes.isSurplusTarget, true),
          sql`${envelopes.id} != ${envelopeId}`,
          sql`${envelopes.archivedAt} IS NULL`
        )
      );

    if (otherSurplusTargets.length === 0) {
      throw new Error("The primary Surplus Sweep Target cannot be archived without designating another public envelope as the sweep target.");
    }

    if (typeof dbClient.update === "function") {
      await dbClient
        .update(envelopes)
        .set({ isSurplusTarget: false })
        .where(
          and(
            eq(envelopes.id, envelopeId),
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId)
          )
        );
    }
  }

  // Soft-archive all pending (unconfirmed) expense events (both scheduled and one-off)
  // Confirmed history and bank accounts are never modified or archived.
  if (typeof dbClient.update === "function") {
    await dbClient
      .update(expenseEvents)
      .set({
        archivedAt: new Date(),
        archivedBy: userId,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(expenseEvents.envelopeId, envelopeId),
          eq(expenseEvents.status, "PENDING"),
          eq(expenseEvents.tenantId, tenantId),
          eq(expenseEvents.appId, appId),
          sql`${expenseEvents.archivedAt} IS NULL`
        )
      );
  }

  const [archived] = await dbClient
    .update(envelopes)
    .set({
      archivedAt: new Date(),
      archivedBy: userId,
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

  return archived;
}
