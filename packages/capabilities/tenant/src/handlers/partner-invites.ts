import { tenantUsers, categories, DbOrTx } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { ensurePremiumAccess } from "@money-matters/core";

/**
 * Invites a partner to join the household tenant.
 */
export function invitePartnerHandler(db: DbOrTx) {
  return async (
    input: { email: string },
    tenantId: string,
    appId: string,
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
        appId,
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
        throw new Error("Invitation email does not match authenticated user email.");
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

    // Auto-seed default Personal category for joining partner
    const [existingPersonal] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, updated.tenantId),
          eq(categories.type, "PERSONAL"),
          eq(categories.userId, userId)
        )
      )
      .limit(1);

    if (!existingPersonal) {
      await db.insert(categories).values({
        tenantId: updated.tenantId,
        appId: updated.appId,
        name: "Personal",
        type: "PERSONAL" as const,
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

    return {
      success: true,
      tenantId: updated.tenantId,
      role: updated.role,
    };
  };
}
