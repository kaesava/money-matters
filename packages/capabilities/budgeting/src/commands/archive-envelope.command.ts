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

  // Clear surplus target designation if this envelope was the surplus target
  if (envelope.isSurplusTarget && typeof dbClient.update === "function") {
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
