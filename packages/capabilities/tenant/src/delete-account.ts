import { PgDatabase } from "drizzle-orm/pg-core";
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
  allocationPlans,
  allocationPlanLines,
  categorySchedules,
  deviceTokens,
  tenantUsers,
  tenants,
  users
} from "@money-matters/db";
import { eq, and, sql } from "drizzle-orm";

export function deleteMyAccountHandler(db: PgDatabase<any, any, any>) {
  return async (tenantId: string, userId: string, email: string, appId: string) => {
    // 1. Hard delete in FK-safe order
    // file_notes
    await db.delete(fileNotes).where(and(eq(fileNotes.tenantId, tenantId), eq(fileNotes.appId, appId)));

    // device_tokens
    await db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));

    // transaction_ledger
    await db.delete(transactionLedger).where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));

    // allocation_plan_lines & allocation_plans
    const plans = await db.select({ id: allocationPlans.id }).from(allocationPlans).where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));
    for (const plan of plans) {
      await db.delete(allocationPlanLines).where(eq(allocationPlanLines.planId, plan.id));
    }
    await db.delete(allocationPlans).where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));

    // expense_events & expense_sources
    await db.delete(expenseEvents).where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId)));
    await db.delete(expenseSources).where(and(eq(expenseSources.tenantId, tenantId), eq(expenseSources.appId, appId)));

    // income_events & income_sources
    await db.delete(incomeEvents).where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));
    await db.delete(incomeSources).where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

    // category_schedules & categories
    const cats = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.tenantId, tenantId), eq(categories.appId, appId)));
    for (const cat of cats) {
      await db.delete(categorySchedules).where(eq(categorySchedules.categoryId, cat.id));
    }
    await db.delete(categories).where(and(eq(categories.tenantId, tenantId), eq(categories.appId, appId)));

    // user_preferences & bank_accounts
    await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
    await db.delete(bankAccounts).where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));

    // tenant_users & tenants & users
    await db.delete(tenantUsers).where(eq(tenantUsers.userId, userId));
    
    // Check if tenant has any remaining active users
    const remainingMembers = await db.select().from(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
    if (remainingMembers.length === 0) {
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    }

    await db.delete(users).where(eq(users.id, userId));

    // 2. Revoke sessions and purge user in neon_auth schema
    try {
      await db.execute(sql`DELETE FROM neon_auth.session WHERE "userId" = ${userId}`);
      await db.execute(sql`DELETE FROM neon_auth.user WHERE id = ${userId}`);
    } catch (err) {
      // Ignore if neon_auth tables are managed externally or DB user lacks direct neon_auth DDL/DML access
      console.warn("Neon auth purge step skipped or failed:", err);
    }

    // 3. Send confirmation email via Resend
    if (email && process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'MoneyMatters <onboarding@resend.dev>',
            to: [email],
            subject: "Your Money Matters Account Has Been Deleted",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                <h2 style="color: #1B2B4B; margin-top: 0;">Account Deletion Confirmed</h2>
                <p style="color: #334155; font-size: 14px; line-height: 1.5;">Hello,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.5;">As requested, your Money Matters account and all associated household financial data have been permanently deleted from our servers.</p>
                <p style="color: #64748b; font-size: 13px;">Thank you for using Money Matters.</p>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Money Matters · Kaesava Platform</p>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.error("Failed to send deletion confirmation email:", err);
      }
    }

    return { success: true };
  };
}
