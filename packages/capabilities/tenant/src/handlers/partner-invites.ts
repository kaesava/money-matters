import { tenantUsers, categories, tenants, DbOrTx } from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";
import { ensurePremiumAccess } from "@money-matters/core";

/**
 * Invites a partner to join the household tenant.
 *
 * DESIGN: appId is NOT stored on tenant_users — it is derived from the parent
 * tenant (tenants.app_id) via JOIN. The appId parameter is removed from this
 * handler's signature as a result.
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
 *
 * Derives appId from the parent tenant (via JOIN) to seed the Personal category,
 * since tenant_users no longer stores app_id.
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

    // Derive appId from parent tenant — tenant_users no longer stores app_id
    const [tenant] = await db
      .select({ appId: tenants.appId })
      .from(tenants)
      .where(eq(tenants.id, updated.tenantId))
      .limit(1);

    if (!tenant) {
      throw new Error("Tenant not found for accepted invitation.");
    }

    // Auto-seed default Personal category for joining partner
    const [existingPersonal] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, updated.tenantId),
          eq(categories.isPrivate, true),
          eq(categories.userId, userId)
        )
      )
      .limit(1);

    if (!existingPersonal) {
      await db.insert(categories).values({
        tenantId: updated.tenantId,
        appId: tenant.appId, // derived from parent tenant
        name: "Personal Private Pool",
        type: "EVERYDAY" as const,
        isPrivate: true,
        userId: userId,
        icon: "user",
        colour: "#EC4899",
        monthlyAmount: "200.00",
        enteredAmount: "200.00",
        budgetFrequency: "MONTHLY",
        rolloverRule: "ROLLOVER" as const,
        isCommitted: false,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    // Verify user email since they successfully accepted an invite sent to their email
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
