import { t } from "@money-matters/i18n";
import {
  envelopes,
  incomeSources,
  incomeEvents,
  expenseEvents,
  transactionLedger,
  bankAccounts,
  userPreferences,
  tenantUserPreferences,
  allocationPlans,
  allocationPlanLines,
  deviceTokens,
  tenantUsers,
  transferEvents,
  billingInvoices,
  aiUsage,
  earlyAccessSubscribers,
  tenants,
  users,
  DbOrTx,
} from "@money-matters/db";
import { eq, and, sql, inArray, ne } from "drizzle-orm";
import { sendNotificationEmail, logger } from "@money-matters/core";
import Stripe from "stripe";

async function cancelStripeResources(tenantRecord: {
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
} | undefined) {
  if (!process.env.STRIPE_SECRET_KEY) return;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  if (tenantRecord?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(tenantRecord.stripeSubscriptionId);
    } catch (stripeErr) {
      logger.error("Failed to cancel Stripe subscription during account deletion:", { stripeErr });
      const isMissing =
        stripeErr instanceof Error &&
        (stripeErr.message.includes("No such subscription") || stripeErr.message.includes("resource_missing"));
      if (!isMissing) {
        throw new Error("Unable to cancel Stripe subscription. Account deletion aborted for billing safety.");
      }
    }
  }

  if (tenantRecord?.stripeCustomerId) {
    try {
      await stripe.customers.del(tenantRecord.stripeCustomerId);
    } catch (custErr) {
      logger.warn("Failed to delete Stripe customer during account deletion:", { custErr });
    }
  }
}

async function purgeNeonAuthRecords(tx: DbOrTx, userId: string) {
  try {
    await tx.execute(sql`SAVEPOINT neon_auth_purge`);
    await tx.execute(sql`DELETE FROM neon_auth.session WHERE "userId" = ${userId}`);
    await tx.execute(sql`DELETE FROM neon_auth.user WHERE id = ${userId}`);
    await tx.execute(sql`RELEASE SAVEPOINT neon_auth_purge`);
  } catch (err) {
    await tx.execute(sql`ROLLBACK TO SAVEPOINT neon_auth_purge`).catch(() => {});
    logger.warn("Neon auth purge step skipped or failed:", { err });
  }
}

async function purgeHouseholdRecords(
  tx: DbOrTx,
  tenantId: string,
  userId: string,
  email: string,
  appId: string,
  allUserIdsToPurgeTokens: string[]
) {
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
  await tx.delete(transferEvents).where(and(eq(transferEvents.tenantId, tenantId), eq(transferEvents.appId, appId)));
  await tx.delete(incomeEvents).where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));
  await tx.delete(incomeSources).where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));
  await tx.delete(envelopes).where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId)));

  await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
  await tx.delete(tenantUserPreferences).where(eq(tenantUserPreferences.userId, userId));
  await tx.delete(bankAccounts).where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));
  await tx.delete(billingInvoices).where(eq(billingInvoices.tenantId, tenantId));
  await tx.delete(aiUsage).where(eq(aiUsage.tenantId, tenantId));
  if (email) {
    await tx.delete(earlyAccessSubscribers).where(eq(earlyAccessSubscribers.email, email));
  }

  await tx.delete(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
  await tx.delete(tenants).where(eq(tenants.id, tenantId));
  await tx.delete(users).where(eq(users.id, userId));

  await purgeNeonAuthRecords(tx, userId);
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

    const [tenantRecord] = await db
      .select({
        stripeSubscriptionId: tenants.stripeSubscriptionId,
        stripeCustomerId: tenants.stripeCustomerId,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    await cancelStripeResources(tenantRecord);

    await db.transaction(async (tx) => {
      const [membership] = await tx
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
        .limit(1);

      if (membership && membership.role !== "OWNER") {
        throw new Error("Only the Household Owner can delete the household tenant. Partners can leave the household.");
      }

      await purgeHouseholdRecords(tx, tenantId, userId, email, appId, allUserIdsToPurgeTokens);
    });

    await sendNotificationEmail(
      email,
      t("privacy.deletionConfirmedTitle"),
      t("privacy.deletionConfirmedBody")
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
    return await db.transaction(async (tx) => {
      const [membership] = await tx
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
        .limit(1);

      if (!membership) {
        throw new Error("You are not a member of this household.");
      }

      const remainingMembers = await tx
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), ne(tenantUsers.userId, userId)));

      if (membership.role === "OWNER") {
        if (remainingMembers.length === 0) {
          throw new Error("You are the sole owner of this household. Please delete the household instead of leaving.");
        }
        const nextOwner = remainingMembers[0];
        await tx
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

      // Purge user's private bank accounts and linked envelopes
      const privateBankAccs = await tx
        .select({ id: bankAccounts.id })
        .from(bankAccounts)
        .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.userId, userId), eq(bankAccounts.isPrivate, true)));

      const privateBankAccIds = privateBankAccs.map((b) => b.id);

      if (privateBankAccIds.length > 0) {
        await tx.delete(envelopes).where(inArray(envelopes.bankAccountId, privateBankAccIds));
        await tx.delete(bankAccounts).where(inArray(bankAccounts.id, privateBankAccIds));
      }

      await tx.delete(tenantUserPreferences).where(and(eq(tenantUserPreferences.tenantId, tenantId), eq(tenantUserPreferences.userId, userId)));
      await tx.delete(tenantUsers).where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));

      const remainingTenantUsers = await tx
        .select({ id: tenantUsers.id })
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId));

      return { success: true, hasOtherHousehold: remainingTenantUsers.length > 0 };
    });
  };
}
