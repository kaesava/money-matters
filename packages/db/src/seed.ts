import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  tenants,
  tenantUsers,
  userPreferences,
  tenantUserPreferences,
  apps,
  earlyAccessSubscribers,
  billingInvoices,
} from "@money-matters/db";
import { DEFAULT_APP_FEATURE_FLAGS } from "@money-matters/types";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
import { ensureNeonAuthUser, cleanupTables } from "./seeds/neon-auth-setup.js";
import { seedSampleHousehold } from "./seeds/sample-household.js";
import { seedTesterHousehold } from "./seeds/tester-household.js";

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: "../../.env.development" });
}

function createDbClient(connectionString: string) {
  const sqlClient = neon(connectionString);
  return drizzle(sqlClient);
}

export async function seedDatabase(connectionString: string, envLabel: string) {
  console.log(`\n🌱 Seeding database for environment [${envLabel}]...`);
  const db = createDbClient(connectionString);

  const isProd = envLabel === "production" || connectionString.includes("ep-spring-snow");
  const appId = "01908bde-34bb-7b19-a178-574211bc93aa";

  const authUrl =
    process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
    (isProd
      ? "https://ep-spring-snow-a70f61xz.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth"
      : "https://ep-icy-resonance-a7s94hg4.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth");
  const originUrl = isProd ? "https://moneymatters.kaesava.au" : "http://localhost:3000";

  // 1. Primary Users
  const tenantId = "d3b07384-d113-4ec4-a5a4-000000000001";
  const kaesavaPassword = process.env.SEED_ADMIN_PASSWORD || (isProd ? crypto.randomUUID() : "Password123!");
  const userId = await ensureNeonAuthUser(db, authUrl, originUrl, "kaesava@gmail.com", kaesavaPassword, "Kaesava", "d3b07384-d113-4ec4-a5a4-000000000001");

  const snehaEmail = "snehaparkhi@gmail.com";
  const snehaPassword = process.env.SEED_PARTNER_PASSWORD || (isProd ? crypto.randomUUID() : "Password123!");
  const snehaUserId = await ensureNeonAuthUser(db, authUrl, originUrl, snehaEmail, snehaPassword, "Sneha", "d3b07384-d113-4ec4-a5a4-000000000004");

  const raehanEmail = "raehankaesava@gmail.com";
  const raehanPassword = process.env.SEED_MEMBER_PASSWORD || (isProd ? crypto.randomUUID() : "Password123!");
  const raehanTenantId = "d3b07384-d113-4ec4-a5a4-000000000003";
  const raehanUserId = await ensureNeonAuthUser(db, authUrl, originUrl, raehanEmail, raehanPassword, "Raehan Kaesava", "d3b07384-d113-4ec4-a5a4-000000000003");

  const testerEmail = "tester-play@kaesava.au";
  const testerPassword = process.env.SEED_TESTER_PASSWORD || (isProd ? crypto.randomUUID() : "Password123!");
  const testerTenantId = "d3b07384-d113-4ec4-a5a4-000000000002";
  const testerUserId = await ensureNeonAuthUser(db, authUrl, originUrl, testerEmail, testerPassword, "Play Store Tester", "d3b07384-d113-4ec4-a5a4-000000000002");

  await cleanupTables(db, isProd, [userId, snehaUserId, raehanUserId, testerUserId]);

  try {
    await db.execute(sql`
      TRUNCATE TABLE 
        transaction_ledger,
        allocation_plan_lines,
        allocation_plans,
        allocation_strategy_steps,
        allocation_strategies,
        file_notes,
        transfer_events,
        expense_events,
        income_events,
        income_sources,
        envelopes,
        bank_accounts,
        device_tokens,
        billing_invoices,
        ai_usage,
        processed_webhooks,
        tenant_user_preferences,
        user_preferences,
        tenant_users,
        early_access_subscribers,
        tenants
      CASCADE
    `);
  } catch (err) {
    console.log("Domain table truncation notice:", err instanceof Error ? err.message : err);
  }

  const now = new Date();

  // Ensure App Exists
  await db
    .insert(apps)
    .values({
      id: appId,
      name: "Money Matters",
      slug: "money-matters",
      featureFlags: DEFAULT_APP_FEATURE_FLAGS,
    })
    .onConflictDoUpdate({
      target: apps.id,
      set: {
        name: "Money Matters",
        slug: "money-matters",
        featureFlags: DEFAULT_APP_FEATURE_FLAGS,
        updatedAt: now,
      },
    });

  // Ensure Early Access Subscriber
  await db
    .insert(earlyAccessSubscribers)
    .values({
      appId,
      email: "kaesava@gmail.com",
      lastSubscribedAt: now,
    })
    .onConflictDoNothing();


  // Create Tenants
  const [household] = await db
    .insert(tenants)
    .values({
      id: tenantId,
      name: "Kaesava & Sneha Household",
      country: "AU",
      currency: "AUD",
      timezone: "Australia/Melbourne",
      premiumEnabled: true,
      subscriptionStatus: "SUBSCRIBED",
      trialStartedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      subscribedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      subscriptionEndsAt: new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      appId,
      setupCompletedAt: now,
      setupStatus: "COMPLETED",
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [raehanHousehold] = await db
    .insert(tenants)
    .values({
      id: raehanTenantId,
      name: "Raehan Independent Tenant",
      country: "AU",
      currency: "AUD",
      timezone: "Australia/Melbourne",
      premiumEnabled: true,
      subscriptionStatus: "TRIAL_ACTIVE",
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      appId,
      setupCompletedAt: now,
      setupStatus: "COMPLETED",
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    })
    .returning();

  const [testerHousehold] = await db
    .insert(tenants)
    .values({
      id: testerTenantId,
      name: "Play Store Review Tenant",
      country: "AU",
      currency: "AUD",
      timezone: "Australia/Sydney",
      premiumEnabled: true,
      subscriptionStatus: "TRIAL_ACTIVE",
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      appId,
      setupCompletedAt: now,
      setupStatus: "COMPLETED",
      createdBy: testerUserId,
      updatedBy: testerUserId,
    })
    .returning();

  // Tenant Users
  await db.insert(tenantUsers).values([
    { tenantId: household.id, userId, role: "OWNER" as const, inviteStatus: "ACCEPTED" as const, createdBy: userId, updatedBy: userId },
    { tenantId: household.id, userId: snehaUserId, inviteEmail: snehaEmail, role: "MEMBER" as const, inviteStatus: "ACCEPTED" as const, invitedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), createdBy: userId, updatedBy: userId },
    { tenantId: household.id, userId: raehanUserId, inviteEmail: raehanEmail, role: "MEMBER" as const, inviteStatus: "ACCEPTED" as const, invitedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), createdBy: userId, updatedBy: userId },
    {
      tenantId: household.id,
      userId: null,
      inviteEmail: "alex.accountant@example.com",
      role: "MEMBER" as const,
      inviteStatus: "PENDING" as const,
      inviteToken: "d3b07384-d113-4ec4-a5a4-000000000099",
      invitedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      createdBy: userId,
      updatedBy: userId,
    },
    { tenantId: raehanHousehold.id, userId: raehanUserId, role: "OWNER" as const, inviteStatus: "ACCEPTED" as const, createdBy: raehanUserId, updatedBy: raehanUserId },
    { tenantId: raehanHousehold.id, userId, inviteEmail: "kaesava@gmail.com", role: "MEMBER" as const, inviteStatus: "ACCEPTED" as const, invitedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), createdBy: raehanUserId, updatedBy: raehanUserId },
    { tenantId: testerHousehold.id, userId: testerUserId, role: "OWNER" as const, inviteStatus: "ACCEPTED" as const, createdBy: testerUserId, updatedBy: testerUserId },
  ]);

  await db.insert(userPreferences).values([
    { userId, theme: "system", showIcons: true, createdBy: userId, updatedBy: userId },
    { userId: snehaUserId, theme: "system", showIcons: true, createdBy: snehaUserId, updatedBy: snehaUserId },
    { userId: raehanUserId, theme: "system", showIcons: true, createdBy: raehanUserId, updatedBy: raehanUserId },
    { userId: testerUserId, theme: "system", showIcons: true, createdBy: testerUserId, updatedBy: testerUserId },
  ]);

  const defaultAppPrefs = {
    weekly_digest_email: true,
    weekly_digest_push: true,
    payday_alerts_email: true,
    payday_alerts_push: true,
    balance_nudge_email: true,
    balance_nudge_push: true,
  };

  await db.insert(tenantUserPreferences).values([
    { userId, tenantId, appId, appPreferences: { [appId]: defaultAppPrefs }, createdBy: userId, updatedBy: userId },
    { userId: snehaUserId, tenantId, appId, appPreferences: { [appId]: defaultAppPrefs }, createdBy: snehaUserId, updatedBy: snehaUserId },
    { userId: raehanUserId, tenantId: raehanTenantId, appId, appPreferences: { [appId]: defaultAppPrefs }, createdBy: raehanUserId, updatedBy: raehanUserId },
    { userId: testerUserId, tenantId: testerTenantId, appId, appPreferences: { [appId]: defaultAppPrefs }, createdBy: testerUserId, updatedBy: testerUserId },
  ]);

  // Seed sample billing invoice for subscribed household
  await db.insert(billingInvoices).values({
    tenantId: household.id,
    stripeInvoiceId: "in_seed_fy27_001",
    stripeCustomerId: "cus_seed_kaesava_001",
    stripeSubscriptionId: "sub_seed_kaesava_001",
    amountPaid: "14.99",
    currency: "AUD",
    status: "paid",
    paidAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    periodStart: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    periodEnd: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
    createdBy: userId,
    updatedBy: userId,
  });

  // Seed sample household financial data (bank accounts, envelopes, paydays, transactions)
  await seedSampleHousehold(db, {
    tenantId,
    appId,
    userId,
    snehaUserId,
    now,
  });

  // Seed Play Store Review tester household so reviewer sees realistic active data
  await seedTesterHousehold(db, {
    tenantId: testerTenantId,
    appId,
    userId: testerUserId,
    now,
  });

  console.log(`🎉 Seed data successfully populated for [${envLabel}] across all tables!`);
}

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const envLabel = process.env.NODE_ENV || "development";
  await seedDatabase(connectionString, envLabel);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
