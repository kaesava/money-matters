import { t } from '@money-matters/i18n';
import { 
  pools,
  categories, 
  incomeSources, 
  incomeEvents, 
  expenseSources, 
  expenseEvents, 
  transactionLedger, 
  bankAccounts, 
  userPreferences,
  tenantUserPreferences,
  allocationPlans,
  allocationPlanLines,
  deviceTokens,
  tenantUsers,
  tenants,
  users,
  DbOrTx,
} from "@money-matters/db";
import { eq, and, sql, inArray, ne } from "drizzle-orm";

async function sendNotificationEmail(to: string, subject: string, bodyText: string) {
  if (!to || !process.env.RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'MoneyMatters <noreply@moneymatters.kaesava.au>',
        to: [to],
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <h2 style="color: #1B2B4B; margin-top: 0;">${subject}</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.5;">${bodyText}</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("Failed to send notification email:", err);
  }
}

/**
 * Hard-deletes the entire tenant/household and all financial data. (Owner only)
 */
export function deleteMyAccountHandler(db: DbOrTx) {
  return async (tenantId: string, userId: string, email: string, appId: string) => {
    const partnerMemberships = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), ne(tenantUsers.userId, userId)));

    const partnerUserIds = partnerMemberships
      .map((p) => p.userId)
      .filter((id): id is string => Boolean(id));
    const allUserIdsToPurgeTokens: string[] = [userId, ...partnerUserIds];


    await db.transaction(async (tx) => {
      const [membership] = await tx
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
        .limit(1);

      if (membership && membership.role !== "OWNER") {
        throw new Error("Only the Household Owner can delete the household tenant. Partners can leave the household.");
      }

      // Hard delete all tenant records in FK-safe order
      if (allUserIdsToPurgeTokens.length > 0) {
        await tx.delete(deviceTokens).where(inArray(deviceTokens.userId, allUserIdsToPurgeTokens));
      }
      await tx.delete(transactionLedger).where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));

      const plans = await tx.select({ id: allocationPlans.id }).from(allocationPlans).where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));
      const planIds = plans.map((p) => p.id);
      if (planIds.length > 0) {
        await tx.delete(allocationPlanLines).where(inArray(allocationPlanLines.planId, planIds));
      }
      await tx.delete(allocationPlans).where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));

      await tx.delete(expenseEvents).where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId)));
      await tx.delete(expenseSources).where(and(eq(expenseSources.tenantId, tenantId), eq(expenseSources.appId, appId)));

      await tx.delete(incomeEvents).where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));
      await tx.delete(incomeSources).where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

      await tx.delete(categories).where(and(eq(categories.tenantId, tenantId), eq(categories.appId, appId)));
      await tx.delete(pools).where(and(eq(pools.tenantId, tenantId), eq(pools.appId, appId)));

      await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
      await tx.delete(tenantUserPreferences).where(eq(tenantUserPreferences.userId, userId));
      await tx.delete(bankAccounts).where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

      await tx.delete(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
      await tx.delete(tenants).where(eq(tenants.id, tenantId));
      await tx.delete(users).where(eq(users.id, userId));

      try {
        await tx.execute(sql`DELETE FROM neon_auth.session WHERE "userId" = ${userId}`);
        await tx.execute(sql`DELETE FROM neon_auth.user WHERE id = ${userId}`);
      } catch (err) {
        console.warn("Neon auth purge step skipped or failed:", err);
      }
    });

    await sendNotificationEmail(
      email,
      t('privacy.deletionConfirmedTitle'),
      t('privacy.deletionConfirmedBody')
    );

    for (const partner of partnerMemberships) {
      if (partner.inviteEmail) {
        await sendNotificationEmail(
          partner.inviteEmail,
          "Household Budget Deleted by Owner",
          `Your Money Matters household budget has been deleted by the owner (${email}). All shared data has been permanently erased.`
        );
      }
    }

    return { success: true };
  };
}


/**
 * Removes user from household tenant and purges user's private data.
 * If user is OWNER and a partner exists, ownership transfers automatically to the partner.
 */
export function leaveTenantHandler(db: DbOrTx) {
  return async (tenantId: string, userId: string, email: string, appId: string) => {
    const [membership] = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new Error("You are not a member of this household.");
    }

    const remainingMembers = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), ne(tenantUsers.userId, userId)));

    if (membership.role === "OWNER") {
      if (remainingMembers.length === 0) {
        throw new Error("You are the sole owner of this household. Please delete the household instead of leaving.");
      }
      const nextOwner = remainingMembers[0];
      await db
        .update(tenantUsers)
        .set({ role: "OWNER", updatedAt: new Date(), updatedBy: userId })
        .where(eq(tenantUsers.id, nextOwner.id));

      if (nextOwner.inviteEmail) {
        await sendNotificationEmail(
          nextOwner.inviteEmail,
          "Household Ownership Transferred to You",
          `The former owner (${email}) has left the household. You are now the Household Owner.`
        );
      }
    } else {
      const ownerMember = remainingMembers.find((m) => m.role === "OWNER");
      if (ownerMember?.inviteEmail) {
        await sendNotificationEmail(
          ownerMember.inviteEmail,
          "Household Member Left",
          `${email} has left your household budget.`
        );
      }
    }

    // Purge user's private bank accounts and linked pools/categories
    const privateBankAccs = await db
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.userId, userId), eq(bankAccounts.isPrivate, true)));

    const privateBankAccIds = privateBankAccs.map((b) => b.id);

    if (privateBankAccIds.length > 0) {
      const privatePoolsList = await db
        .select({ id: pools.id })
        .from(pools)
        .where(inArray(pools.bankAccountId, privateBankAccIds));
      
      const privatePoolIds = privatePoolsList.map((p) => p.id);

      if (privatePoolIds.length > 0) {
        await db.delete(categories).where(inArray(categories.poolId, privatePoolIds));
        await db.delete(pools).where(inArray(pools.id, privatePoolIds));
      }
      await db.delete(bankAccounts).where(inArray(bankAccounts.id, privateBankAccIds));
    }

    await db.delete(tenantUserPreferences).where(and(eq(tenantUserPreferences.tenantId, tenantId), eq(tenantUserPreferences.userId, userId)));
    await db.delete(tenantUsers).where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));

    const remainingTenantUsers = await db
      .select({ id: tenantUsers.id })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId));

    return { success: true, hasOtherHousehold: remainingTenantUsers.length > 0 };
  };
}
