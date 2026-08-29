import { t } from '@money-matters/i18n';
import { 
  categories, 
  incomeSources, 
  incomeEvents, 
  expenseSources, 
  expenseEvents, 
  transactionLedger, 
  bankAccounts, 
  fileNotes, 
  userPreferences,
  tenantUserPreferences,
  allocationPlans,
  allocationPlanLines,
  categorySchedules,
  deviceTokens,
  tenantUsers,
  tenants,
  users,
  DbOrTx,
} from "@money-matters/db";
import { eq, and, sql, inArray, ne } from "drizzle-orm";

/**
 * Sends a transactional email notification via Resend API if API key is present.
 */
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
    // 0. Verify role: only OWNER can delete tenant
    const [membership] = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
      .limit(1);

    if (membership && membership.role !== "OWNER") {
      throw new Error("Only the Household Owner can delete the household tenant. Partners can leave the household.");
    }

    // Find active partner members to notify
    const partnerMemberships = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), ne(tenantUsers.userId, userId)));

    // 1. Hard delete all tenant records in FK-safe order
    await db.delete(fileNotes).where(and(eq(fileNotes.tenantId, tenantId), eq(fileNotes.appId, appId)));
    await db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
    await db.delete(transactionLedger).where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));

    const plans = await db.select({ id: allocationPlans.id }).from(allocationPlans).where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));
    const planIds = plans.map((p) => p.id);
    if (planIds.length > 0) {
      await db.delete(allocationPlanLines).where(inArray(allocationPlanLines.planId, planIds));
    }
    await db.delete(allocationPlans).where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));

    await db.delete(expenseEvents).where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId)));
    await db.delete(expenseSources).where(and(eq(expenseSources.tenantId, tenantId), eq(expenseSources.appId, appId)));

    await db.delete(incomeEvents).where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));
    await db.delete(incomeSources).where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

    const cats = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.tenantId, tenantId), eq(categories.appId, appId)));
    const catIds = cats.map((c) => c.id);
    if (catIds.length > 0) {
      await db.delete(categorySchedules).where(inArray(categorySchedules.categoryId, catIds));
    }
    await db.delete(categories).where(and(eq(categories.tenantId, tenantId), eq(categories.appId, appId)));

    await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
    await db.delete(tenantUserPreferences).where(eq(tenantUserPreferences.userId, userId));
    await db.delete(bankAccounts).where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    await db.delete(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    await db.delete(users).where(eq(users.id, userId));

    // 2. Revoke sessions and purge user in neon_auth schema
    try {
      await db.execute(sql`DELETE FROM neon_auth.session WHERE "userId" = ${userId}`);
      await db.execute(sql`DELETE FROM neon_auth.user WHERE id = ${userId}`);
    } catch (err) {
      console.warn("Neon auth purge step skipped or failed:", err);
    }

    // 3. Send confirmation email to user & partner notifications
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
    // 1. Get current membership
    const [membership] = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new Error("You are not a member of this household.");
    }

    // 2. Find remaining members
    const remainingMembers = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), ne(tenantUsers.userId, userId)));

    // If Owner leaving:
    if (membership.role === "OWNER") {
      if (remainingMembers.length === 0) {
        throw new Error("You are the sole owner of this household. Please delete the household instead of leaving.");
      }
      // Transfer ownership to first remaining partner
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
      // Notify owner that partner has left
      const ownerMember = remainingMembers.find((m) => m.role === "OWNER");
      if (ownerMember?.inviteEmail) {
        await sendNotificationEmail(
          ownerMember.inviteEmail,
          "Household Member Left",
          `${email} has left your household budget.`
        );
      }
    }

    // 3. Purge user's private categories & private bank accounts
    const privateCats = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.userId, userId), eq(categories.isPrivate, true)));
    const privateCatIds = privateCats.map((c) => c.id);

    if (privateCatIds.length > 0) {
      await db.delete(categorySchedules).where(inArray(categorySchedules.categoryId, privateCatIds));
      await db.delete(categories).where(inArray(categories.id, privateCatIds));
    }

    await db.delete(bankAccounts).where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.userId, userId), eq(bankAccounts.isPrivate, true)));

    // 4. Delete tenant-scoped preferences and membership for this household only
    await db.delete(tenantUserPreferences).where(and(eq(tenantUserPreferences.tenantId, tenantId), eq(tenantUserPreferences.userId, userId)));
    await db.delete(tenantUsers).where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));

    // 5. Check if user belongs to any remaining households
    const remainingTenantUsers = await db
      .select({ id: tenantUsers.id })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId));

    return { success: true, hasOtherHousehold: remainingTenantUsers.length > 0 };
  };
}
