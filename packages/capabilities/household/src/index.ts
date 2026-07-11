import { z } from "zod";
import { households, householdMembers, bankAccounts } from "@money-matters/db";
import { 
  CreateHouseholdCommand, 
  CreateBankAccountCommand, 
  UpdateBankAccountCommand 
} from "@money-matters/types";
import { eq, and } from "drizzle-orm";

export function createHouseholdHandler(db: any) {
  return async (input: z.infer<typeof CreateHouseholdCommand>, appId: string) => {
    return await db.transaction(async (tx: any) => {
      // 1. Create the household record
      const [household] = await tx
        .insert(households)
        .values({
          tenantId: input.userId, // tenantId = householdId = userId in V1 signup
          appId,
          name: input.name,
          createdBy: input.userId,
          updatedBy: input.userId,
        })
        .returning();

      // 2. Add the owner record to household_members
      await tx
        .insert(householdMembers)
        .values({
          householdId: household.id,
          userId: input.userId,
          role: "OWNER" as const,
          inviteStatus: "ACCEPTED" as const,
          tenantId: input.userId,
          appId,
          createdBy: input.userId,
          updatedBy: input.userId,
        });

      return { 
        success: true, 
        householdId: household.id, 
        tenantId: input.userId 
      };
    });
  };
}

export function createBankAccountHandler(db: any) {
  return async (
    input: z.infer<typeof CreateBankAccountCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [bankAccount] = await db
      .insert(bankAccounts)
      .values({
        householdId: tenantId,
        name: input.name,
        purpose: input.purpose,
        lastKnownBalance: input.lastKnownBalance,
        isOffset: input.isOffset,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return bankAccount;
  };
}

export function updateBankAccountHandler(db: any) {
  return async (
    accountId: string, 
    input: z.infer<typeof UpdateBankAccountCommand>, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [updated] = await db
      .update(bankAccounts)
      .set({
        ...input,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    return updated;
  };
}

export function archiveBankAccountHandler(db: any) {
  return async (
    accountId: string, 
    tenantId: string, 
    appId: string, 
    userId: string
  ) => {
    const [archived] = await db
      .update(bankAccounts)
      .set({
        archivedAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId)
        )
      )
      .returning();

    if (!archived) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    return { success: true };
  };
}

export function getHouseholdHandler(db: any) {
  return async (tenantId: string, appId: string) => {
    const [household] = await db
      .select()
      .from(households)
      .where(
        and(
          eq(households.tenantId, tenantId),
          eq(households.appId, appId)
        )
      )
      .limit(1);

    if (!household) return null;

    const members = await db
      .select()
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, household.id),
          eq(householdMembers.tenantId, tenantId),
          eq(householdMembers.appId, appId)
        )
      );

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.householdId, household.id),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId)
        )
      );

    return {
      ...household,
      members,
      bankAccounts: accounts,
    };
  };
}
