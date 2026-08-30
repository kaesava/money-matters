import { tenantUsers, bankAccounts, pools, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { ensurePremiumAccess } from "@money-matters/core";

/**
 * Invites a partner to join the household tenant.
 */
export function invitePartnerHandler(db: DbOrTx) {
  return async (
    input: { email: string },
    tenantId: string,
    userId: string
  ) => {
    await ensurePremiumAccess(db, tenantId, "Household partner invitations");

    const inviteToken = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const [created] = await db
      .insert(tenantUsers)
      .values({
        tenantId,
        inviteEmail: input.email,
        inviteToken,
        inviteStatus: "PENDING" as const,
        role: "MEMBER" as const,
        invitedAt: now,
        expiresAt,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return {
      success: true,
      inviteToken: created.inviteToken,
      inviteEmail: created.inviteEmail,
      expiresAt: created.expiresAt,
    };
  };
}

/**
 * Accepts a household partner invitation after verifying token expiry and email identity.
 */
export function acceptInviteHandler(db: DbOrTx) {
  return async (input: { inviteToken: string }, userId: string, userEmail?: string) => {
    const [invite] = await db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.inviteToken, input.inviteToken),
          eq(tenantUsers.inviteStatus, "PENDING")
        )
      )
      .limit(1);

    if (!invite) {
      throw new Error("Invalid or expired invitation token.");
    }

    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      throw new Error("Invitation token has expired. Please request a new invitation from the household owner.");
    }

    if (invite.inviteEmail) {
      if (!userEmail || invite.inviteEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
        throw new Error(
          `Invitation email (${invite.inviteEmail}) does not match your active logged-in email (${userEmail || "unauthenticated"}). Please switch accounts or log out to accept this invitation.`
        );
      }
    }

    const [updated] = await db
      .update(tenantUsers)
      .set({
        userId,
        inviteStatus: "ACCEPTED" as const,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(tenantUsers.id, invite.id))
      .returning();

    const [tenant] = await db
      .select({ appId: tenants.appId })
      .from(tenants)
      .where(eq(tenants.id, updated.tenantId))
      .limit(1);

    if (!tenant) {
      throw new Error("Tenant not found for accepted invitation.");
    }

    // Auto-seed default Private Personal Bank Account & Pool for joining partner
    const [existingPrivateAcc] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.tenantId, updated.tenantId),
          eq(bankAccounts.isPrivate, true),
          eq(bankAccounts.userId, userId)
        )
      )
      .limit(1);

    if (!existingPrivateAcc) {
      const [partnerAcc] = await db
        .insert(bankAccounts)
        .values({
          tenantId: updated.tenantId,
          appId: tenant.appId,
          name: "Personal Private Account",
          lastKnownBalance: "0.00",
          unbudgetedBuffer: "0.00",
          isPrivate: true,
          userId: userId,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      await db.insert(pools).values({
        tenantId: updated.tenantId,
        appId: tenant.appId,
        name: "Personal Everyday Pool",
        poolType: "EVERYDAY",
        bankAccountId: partnerAcc.id,
        everydayAllowanceAmount: "200.00",
        createdBy: userId,
        updatedBy: userId,
      });
    }

    if (typeof db.execute === "function") {
      await db.execute(sql`UPDATE neon_auth.user SET "emailVerified" = true, "updatedAt" = NOW() WHERE id = ${userId} AND ("emailVerified" = false OR "emailVerified" IS NULL)`);
    }

    return {
      success: true,
      tenantId: updated.tenantId,
      role: updated.role,
    };
  };
}
