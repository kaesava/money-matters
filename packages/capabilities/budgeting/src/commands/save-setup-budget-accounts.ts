import { DbOrTx, bankAccounts } from "@money-matters/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface SaveSetupAccountInput {
  id?: string;
  name: string;
  bankProvider?: string | null;
  accountType?: "EVERYDAY" | "SAVINGS" | "LOAN_OFFSET";
  lastKnownBalance?: string;
  unbudgetedBuffer?: string;
  isPrivate?: boolean;
}

export async function processSetupBankAccounts(
  tx: DbOrTx,
  accountsInput: SaveSetupAccountInput[],
  archivedAccountIds: string[],
  tenantId: string,
  appId: string,
  userId: string,
  now: Date
): Promise<{ accountIdMap: Map<string, string>; primaryBankAccountId: string }> {
  const existingAccounts = await tx
    .select()
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.tenantId, tenantId),
        eq(bankAccounts.appId, appId),
        sql`${bankAccounts.archivedAt} IS NULL`
      )
    );

  const accountIdMap = new Map<string, string>();

  for (let i = 0; i < accountsInput.length; i++) {
    const accInput = accountsInput[i];
    const matchedExisting =
      (accInput.id ? existingAccounts.find((a) => a.id === accInput.id) : null) ||
      existingAccounts.find((a) => a.name.trim().toLowerCase() === accInput.name.trim().toLowerCase()) ||
      (i === 0 && existingAccounts.length === 1 ? existingAccounts[0] : null);

    const bankProviderVal = accInput.bankProvider || matchedExisting?.bankProvider || "Other";

    if (matchedExisting) {
      if (typeof tx.update === "function") {
        await tx
          .update(bankAccounts)
          .set({
            name: accInput.name,
            bankProvider: bankProviderVal,
            accountType: accInput.accountType || matchedExisting.accountType,
            lastKnownBalance: accInput.lastKnownBalance || matchedExisting.lastKnownBalance,
            unbudgetedBuffer: accInput.unbudgetedBuffer || matchedExisting.unbudgetedBuffer,
            isPrivate: accInput.isPrivate ?? matchedExisting.isPrivate,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(bankAccounts.id, matchedExisting.id));
      }
      if (accInput.id) accountIdMap.set(accInput.id, matchedExisting.id);
      accountIdMap.set(`idx-${i}`, matchedExisting.id);
    } else {
      const newAccountId = randomUUID();
      if (typeof tx.insert === "function") {
        await tx.insert(bankAccounts).values({
          id: newAccountId,
          tenantId,
          appId,
          name: accInput.name,
          bankProvider: bankProviderVal,
          accountType: accInput.accountType || "EVERYDAY",
          lastKnownBalance: accInput.lastKnownBalance || "0.00",
          unbudgetedBuffer: accInput.unbudgetedBuffer || "0.00",
          isPrivate: accInput.isPrivate ?? false,
          createdAt: now,
          createdBy: userId,
          updatedAt: now,
          updatedBy: userId,
        });
      }
      if (accInput.id) accountIdMap.set(accInput.id, newAccountId);
      accountIdMap.set(`idx-${i}`, newAccountId);
    }
  }

  if (archivedAccountIds.length > 0 && typeof tx.update === "function") {
    await tx
      .update(bankAccounts)
      .set({
        archivedAt: now,
        archivedBy: userId,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(
        and(
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          inArray(bankAccounts.id, archivedAccountIds)
        )
      );
  }

  const primaryBankAccountId =
    accountIdMap.get(accountsInput[0]?.id || "") ||
    accountIdMap.get("idx-0") ||
    existingAccounts[0]?.id ||
    "";

  return { accountIdMap, primaryBankAccountId };
}
