import { tenantUsers, DbOrTx } from "@money-matters/db";
import { eq, and, sql, isNull } from "drizzle-orm";
import { UpdateHouseholdMemberRoleCommandType } from "@money-matters/types";

export function updateHouseholdMemberRoleHandler(db: DbOrTx) {
  return async (
    input: UpdateHouseholdMemberRoleCommandType,
    tenantId: string,
    callerUserId: string
  ) => {
    // 1. Verify caller is an active OWNER
    const [caller] = await db
      .select({ role: tenantUsers.role })
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.userId, callerUserId),
          eq(tenantUsers.inviteStatus, "ACCEPTED"),
          isNull(tenantUsers.archivedAt)
        )
      )
      .limit(1);

    if (caller?.role !== "OWNER") {
      throw new Error("Only household owners can change member roles.");
    }

    // 2. Find target member
    const memberFilter = input.memberId
      ? eq(tenantUsers.id, input.memberId)
      : input.targetUserId
      ? eq(tenantUsers.userId, input.targetUserId)
      : null;

    if (!memberFilter) {
      throw new Error("Target member ID or User ID is required.");
    }

    const [targetMember] = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), memberFilter, isNull(tenantUsers.archivedAt)))
      .limit(1);

    if (!targetMember) {
      throw new Error("Household member not found.");
    }

    if (targetMember.role === input.newRole) {
      return { success: true, memberId: targetMember.id, newRole: input.newRole };
    }

    // 3. If demoting an OWNER to MEMBER, enforce that there is at least one other active owner
    if (input.newRole === "MEMBER" && targetMember.role === "OWNER") {
      const activeOwners = await db
        .select({ count: sql<number>`count(*)` })
        .from(tenantUsers)
        .where(
          and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.role, "OWNER"),
            eq(tenantUsers.inviteStatus, "ACCEPTED"),
            isNull(tenantUsers.archivedAt)
          )
        );

      const ownerCount = Number(activeOwners[0]?.count ?? 0);
      if (ownerCount <= 1) {
        throw new Error("Cannot demote the sole owner. There must be at least one active owner in the household.");
      }
    }

    // 4. Update role
    const [updated] = await db
      .update(tenantUsers)
      .set({
        role: input.newRole,
        updatedAt: new Date(),
        updatedBy: callerUserId,
      })
      .where(eq(tenantUsers.id, targetMember.id))
      .returning();

    return {
      success: true,
      memberId: updated.id,
      userId: updated.userId,
      newRole: updated.role,
    };
  };
}
