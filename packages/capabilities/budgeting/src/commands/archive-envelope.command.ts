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
  if (envelope.envelopeType === "EVERYDAY" && !envelope.isPrivate) {
    throw new Error("The shared Everyday envelope cannot be deleted or archived.");
  }
  if (envelope.isSurplusTarget) {
    throw new Error("Cannot archive the designated Surplus Target envelope. Please designate another Surplus Target envelope first.");
  }

  const pendingOneOffEvents = await dbClient
    .select()
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.envelopeId, envelopeId),
        eq(expenseEvents.status, "PENDING"),
        eq(expenseEvents.isScheduled, false),
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  if (pendingOneOffEvents.length > 0) {
    throw new Error("Cannot archive an envelope that has upcoming one-off expenses assigned to it.");
  }

  // Cascade delete pending scheduled events for this envelope
  if (typeof dbClient.delete === "function") {
    await dbClient
      .delete(expenseEvents)
      .where(
        and(
          eq(expenseEvents.envelopeId, envelopeId),
          eq(expenseEvents.status, "PENDING"),
          eq(expenseEvents.isScheduled, true),
          eq(expenseEvents.tenantId, tenantId),
          eq(expenseEvents.appId, appId)
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
