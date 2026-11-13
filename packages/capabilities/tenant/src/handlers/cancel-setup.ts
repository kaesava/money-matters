import { tenants, envelopes, bankAccounts, incomeSources, incomeEvents, expenseEvents, DbOrTx } from "@money-matters/db";
import { and, eq, isNull, ne } from "drizzle-orm";
import { seedMinimalWorkspace } from "./create-tenant.js";

export interface CancelSetupResult {
  success: true;
  setupStatus: "CANCELLED" | "COMPLETED";
  alreadyCompleted: boolean;
}

async function archiveNonMinimalEntities(
  tx: DbOrTx,
  tenantId: string,
  appId: string,
  userId: string,
  keepBankAccountId: string,
  keepEverydayEnvelopeId: string | null,
  now: Date
): Promise<void> {
  const envelopeCond = keepEverydayEnvelopeId
    ? and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), ne(envelopes.id, keepEverydayEnvelopeId), isNull(envelopes.archivedAt))
    : and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), ne(envelopes.envelopeType, "EVERYDAY"), isNull(envelopes.archivedAt));
  await tx.update(envelopes).set({ archivedAt: now, archivedBy: userId, isSurplusTarget: false, updatedAt: now, updatedBy: userId }).where(envelopeCond);
  await tx.update(bankAccounts).set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
    .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId), ne(bankAccounts.id, keepBankAccountId), isNull(bankAccounts.archivedAt)));
  await tx.update(incomeSources).set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
    .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), isNull(incomeSources.archivedAt)));
  await tx.update(incomeEvents).set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
    .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId), isNull(incomeEvents.archivedAt)));
  await tx.update(expenseEvents).set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
    .where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId), isNull(expenseEvents.archivedAt)));
}

async function ensureMinimalWorkspaceOnCancel(tx: DbOrTx, tenantId: string, appId: string, userId: string, now: Date): Promise<void> {
  const [existingAccount] = await tx.select({ id: bankAccounts.id }).from(bankAccounts)
    .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId), eq(bankAccounts.isPrivate, false), isNull(bankAccounts.archivedAt))).limit(1);
  const [existingEveryday] = await tx.select({ id: envelopes.id }).from(envelopes)
    .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), eq(envelopes.envelopeType, "EVERYDAY"), eq(envelopes.isPrivate, false), isNull(envelopes.archivedAt))).limit(1);
  const { bankAccountId, everydayEnvelopeId } = await seedMinimalWorkspace(tx, {
    tenantId, appId, userId, existingBankAccountId: existingAccount?.id ?? null, existingEverydayEnvelopeId: existingEveryday?.id ?? null,
  });
  if (existingEveryday) {
    await tx.update(envelopes).set({ bankAccountId, isSurplusTarget: true, isPrivate: false, updatedAt: now, updatedBy: userId }).where(eq(envelopes.id, existingEveryday.id));
  }
  await archiveNonMinimalEntities(tx, tenantId, appId, userId, bankAccountId, everydayEnvelopeId, now);
}

/**
 * Cancels the first-time Setup wizard.
 *  - Never touches a household that already completed Setup (idempotent no-op).
 *  - Ensures ONLY the minimum workspace exists: 1 bank account + the shared Everyday envelope
 *    linked to it. No Income Schedules, Bills or Goals are created.
 *  - Marks Setup as CANCELLED and stamps setupCompletedAt so the app never re-launches the wizard.
 */
export function cancelSetupHandler(db: DbOrTx) {
  return async (tenantId: string, appId: string, userId: string): Promise<CancelSetupResult> => {
    return await db.transaction(async (tx) => {
      const [tenant] = await tx
        .select({ setupStatus: tenants.setupStatus })
        .from(tenants)
        .where(and(eq(tenants.id, tenantId), eq(tenants.appId, appId)))
        .limit(1);

      if (!tenant) {
        throw new Error("Tenant not found.");
      }

      if (tenant.setupStatus === "COMPLETED") {
        return { success: true, setupStatus: "COMPLETED", alreadyCompleted: true };
      }

      const now = new Date();
      await ensureMinimalWorkspaceOnCancel(tx, tenantId, appId, userId, now);

      await tx
        .update(tenants)
        .set({ setupStatus: "CANCELLED", setupCompletedAt: now, updatedAt: now, updatedBy: userId })
        .where(eq(tenants.id, tenantId));

      return { success: true, setupStatus: "CANCELLED", alreadyCompleted: false };
    });
  };
}
