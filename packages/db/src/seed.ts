import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  tenants,
  tenantUsers,
  bankAccounts,
  pools,
  categories,
  incomeSources,
  incomeEvents,
  allocationPlans,
  allocationPlanLines,
  transactionLedger,
  expenseSources,
  expenseEvents,
  transferSources,
  transferEvents,
  userPreferences,
  tenantUserPreferences,
  users,
  apps,
  deviceTokens,
} from "@money-matters/db";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

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

  const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || (isProd ? "https://ep-spring-snow-a70f61xz.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth" : "https://ep-icy-resonance-a7s94hg4.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth");
  const originUrl = isProd ? "https://moneymatters.kaesava.au" : "http://localhost:3000";

  async function ensureNeonAuthUser(_email: string, _pass: string, name: string, fallbackId: string) {
    const email = _email.trim().toLowerCase();
    let resolvedId = fallbackId;

    try {
      const existingRes = await db.execute<{ id: string }>(
        sql`SELECT id FROM neon_auth.user WHERE email = ${email} LIMIT 1`
      );
      const rows = Array.isArray(existingRes) ? existingRes : (existingRes as any)?.rows ?? [];

      if (rows.length > 0) {
        resolvedId = rows[0].id;
      } else {
        const signupUrl = `${authUrl}/sign-up/email`;
        const response = await fetch(signupUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": originUrl,
          },
          body: JSON.stringify({
            email,
            password: _pass,
            name,
          }),
        });

        if (response.ok) {
          const resBody = (await response.json()) as any;
          resolvedId = resBody.user?.id || resBody.id || fallbackId;
        } else {
          await db.execute(sql`
            INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
            VALUES (${fallbackId}, ${name}, ${email}, true, 'user', now(), now())
            ON CONFLICT (email) DO NOTHING
          `);
        }
      }

      await db.execute(sql`
        UPDATE neon_auth.user 
        SET "emailVerified" = true, name = COALESCE(${name}, name), role = COALESCE(role, 'user'), "updatedAt" = now()
        WHERE id = ${resolvedId}
      `);

      console.log(`Pre-verified ${email} (emailVerified = true) in neon_auth.user (ID: ${resolvedId}).`);
    } catch (e) {
      console.log(`neon_auth setup for ${email}:`, e instanceof Error ? e.message : e);
    }

    return resolvedId;
  }

  // 1. Primary User: kaesava@gmail.com
  const tenantId = "d3b07384-d113-4ec4-a5a4-000000000001";
  const kaesavaPassword = "Password123!";
  const userId = await ensureNeonAuthUser("kaesava@gmail.com", kaesavaPassword, "Kaesava", "d3b07384-d113-4ec4-a5a4-000000000001");

  // 2. Secondary Multi-Tenant User: raehankaesava@gmail.com
  const raehanEmail = "raehankaesava@gmail.com";
  const raehanPassword = "Password123!";
  const raehanTenantId = "d3b07384-d113-4ec4-a5a4-000000000003";
  const raehanUserId = await ensureNeonAuthUser(raehanEmail, raehanPassword, "Raehan Kaesava", "d3b07384-d113-4ec4-a5a4-000000000003");

  // 3. Play Store Tester User: tester-play@kaesava.au
  const testerEmail = "tester-play@kaesava.au";
  const testerPassword = isProd ? "whtVT!lNWPp9yb" : "j0niOxWVA7nt#c";
  const testerTenantId = "d3b07384-d113-4ec4-a5a4-000000000002";
  const testerUserId = await ensureNeonAuthUser(testerEmail, testerPassword, "Play Store Tester", "d3b07384-d113-4ec4-a5a4-000000000002");

  // Clean all application and auth tables across neon_auth and public schemas (clean slate)
  try {
    await db.execute(sql`DELETE FROM neon_auth.session`);
    await db.execute(sql`DELETE FROM neon_auth.verification`);
    await db.execute(sql`DELETE FROM neon_auth.account WHERE "userId" NOT IN (${userId}, ${raehanUserId}, ${testerUserId})`);
    await db.execute(sql`DELETE FROM neon_auth.user WHERE id NOT IN (${userId}, ${raehanUserId}, ${testerUserId})`);
  } catch (err) {
    console.log("neon_auth schema clean slate notice:", err instanceof Error ? err.message : err);
  }

  try {
    await db.execute(sql`DELETE FROM public.sessions`);
    await db.execute(sql`DELETE FROM public.verifications`);
  } catch (_e) {
    // Ignored: legacy sessions/verifications tables may not exist in all DB environments
  }

  await db.delete(deviceTokens);
  await db.delete(transactionLedger);
  await db.delete(allocationPlanLines);
  await db.delete(allocationPlans);
  await db.delete(expenseEvents);
  await db.delete(expenseSources);
  await db.delete(transferEvents);
  await db.delete(transferSources);
  await db.delete(incomeEvents);
  await db.delete(incomeSources);
  await db.execute(sql`DELETE FROM public.category_schedules`).catch(() => {});
  await db.delete(categories);
  await db.delete(pools);
  await db.delete(userPreferences);
  await db.delete(tenantUserPreferences);
  await db.delete(bankAccounts);
  await db.delete(tenantUsers);
  await db.delete(tenants);
  await db.delete(users);
  await db.delete(apps);

  console.log("🧹 Cleaned database tables across neon_auth and public schemas (clean slate).");

  // 0. App & User Records
  await db.insert(users).values([
    { id: userId, email: "kaesava@gmail.com", displayName: "Kaesava" },
    { id: raehanUserId, email: raehanEmail, displayName: "Raehan Kaesava" },
    { id: testerUserId, email: testerEmail, displayName: "Play Store Tester" },
  ]);

  await db.insert(apps).values({
    id: appId,
    name: "Money Matters",
    slug: "money-matters",
  });

  // 1. Tenants
  const now = new Date();
  const [household] = await db
    .insert(tenants)
    .values({
      id: tenantId,
      name: "Kaesava Household",
      country: "AU",
      timezone: "Australia/Sydney",
      state: "NSW",
      postcode: "2000",
      fyEndMonthDay: "06-30",
      premiumEnabled: true,
      subscriptionStatus: "TRIAL_ACTIVE",
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      trialGraceEndsAt: new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000),
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [raehanHousehold] = await db
    .insert(tenants)
    .values({
      id: raehanTenantId,
      name: "Raehan Household",
      country: "AU",
      timezone: "Australia/Sydney",
      state: "VIC",
      postcode: "3000",
      fyEndMonthDay: "06-30",
      premiumEnabled: true,
      subscriptionStatus: "TRIAL_ACTIVE",
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      trialGraceEndsAt: new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000),
      appId,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    })
    .returning();

  const [testerHousehold] = await db
    .insert(tenants)
    .values({
      id: testerTenantId,
      name: "Play Store Tester Household",
      country: "AU",
      timezone: "Australia/Sydney",
      state: "QLD",
      postcode: "4000",
      fyEndMonthDay: "06-30",
      premiumEnabled: true,
      subscriptionStatus: "TRIAL_ACTIVE",
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      trialGraceEndsAt: new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000),
      appId,
      createdBy: testerUserId,
      updatedBy: testerUserId,
    })
    .returning();

  // 2. Tenant Users
  await db.insert(tenantUsers).values([
    { tenantId: household.id, userId, role: "OWNER" as const, inviteStatus: "ACCEPTED" as const, createdBy: userId, updatedBy: userId },
    { tenantId: household.id, userId: raehanUserId, inviteEmail: raehanEmail, role: "MEMBER" as const, inviteStatus: "ACCEPTED" as const, invitedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), createdBy: userId, updatedBy: userId },
    { tenantId: raehanHousehold.id, userId: raehanUserId, role: "OWNER" as const, inviteStatus: "ACCEPTED" as const, createdBy: raehanUserId, updatedBy: raehanUserId },
    { tenantId: raehanHousehold.id, userId, inviteEmail: "kaesava@gmail.com", role: "MEMBER" as const, inviteStatus: "ACCEPTED" as const, invitedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), createdBy: raehanUserId, updatedBy: raehanUserId },
    { tenantId: testerHousehold.id, userId: testerUserId, role: "OWNER" as const, inviteStatus: "ACCEPTED" as const, createdBy: testerUserId, updatedBy: testerUserId },
  ]);

  await db.insert(userPreferences).values([
    { userId, theme: "system", showIcons: true, createdBy: userId, updatedBy: userId },
    { userId: raehanUserId, theme: "system", showIcons: true, createdBy: raehanUserId, updatedBy: raehanUserId },
    { userId: testerUserId, theme: "system", showIcons: true, createdBy: testerUserId, updatedBy: testerUserId },
  ]);

  await db.insert(tenantUserPreferences).values([
    { userId, tenantId, appId, appPreferences: { [appId]: { setup_completed: true, setup_completed_at: now.toISOString() } }, createdBy: userId, updatedBy: userId },
    { userId: raehanUserId, tenantId: raehanTenantId, appId, appPreferences: { [appId]: { setup_completed: true, setup_completed_at: now.toISOString() } }, createdBy: raehanUserId, updatedBy: raehanUserId },
    { userId: testerUserId, tenantId: testerTenantId, appId, appPreferences: { [appId]: { setup_completed: true, setup_completed_at: now.toISOString() } }, createdBy: testerUserId, updatedBy: testerUserId },
  ]);

  // 4. Bank Accounts
  const [primaryAccount] = await db
    .insert(bankAccounts)
    .values({ name: "Primary Account", bankProvider: "CBA", lastKnownBalance: "3450.00", unbudgetedBuffer: "500.00", tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [savingsAccount] = await db
    .insert(bankAccounts)
    .values({ name: "High Interest Saver", bankProvider: "ING", lastKnownBalance: "48500.00", unbudgetedBuffer: "0.00", tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [kaesavaPrivateBank] = await db
    .insert(bankAccounts)
    .values({ name: "Kaesava Personal Everyday", bankProvider: "CBA", lastKnownBalance: "850.00", isPrivate: true, userId, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  // 5. Pools
  const [everydayPool] = await db
    .insert(pools)
    .values({ name: "Joint Everyday Pool", poolType: "EVERYDAY", bankAccountId: primaryAccount.id, everydayAllowanceAmount: "1200.00", waterfallPriority: 40, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [billsPool] = await db
    .insert(pools)
    .values({ name: "Joint Bills Pool", poolType: "REGULAR", bankAccountId: primaryAccount.id, isCommitted: true, waterfallPriority: 10, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [emergencyPool] = await db
    .insert(pools)
    .values({ name: "Emergency Reserve", poolType: "GOAL", bankAccountId: savingsAccount.id, isCommitted: true, targetAmount: "15000.00", targetDate: "2026-12-31", waterfallPriority: 20, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [surplusPool] = await db
    .insert(pools)
    .values({ name: "Surplus & Offset Reserve", poolType: "GOAL", bankAccountId: savingsAccount.id, isSurplusTarget: true, targetAmount: "50000.00", waterfallPriority: 99, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [kaesavaPrivatePool] = await db
    .insert(pools)
    .values({ name: "Kaesava Personal Pool", poolType: "EVERYDAY", bankAccountId: kaesavaPrivateBank.id, everydayAllowanceAmount: "300.00", waterfallPriority: 45, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  // 6. Sub-tag Categories
  const categoriesToInsert = [
    { poolId: everydayPool.id, name: "Groceries & Food Supplies", monthlyAmount: "1170.00", icon: "shopping-cart", colour: "#10B981" },
    { poolId: everydayPool.id, name: "Dining Out & Coffee", monthlyAmount: "1040.00", icon: "coffee", colour: "#F59E0B" },
    { poolId: everydayPool.id, name: "Petrol & Fuel", monthlyAmount: "260.00", icon: "navigation", colour: "#3B82F6" },
    { poolId: billsPool.id, name: "Mortgage / Rent Payment", monthlyAmount: "3200.00", isEssential: true, icon: "home", colour: "#EF4444" },
    { poolId: billsPool.id, name: "Electricity & Gas (AGL)", monthlyAmount: "340.00", isEssential: true, icon: "zap", colour: "#F59E0B" },
    { poolId: billsPool.id, name: "NBN Broadband (Aussie)", monthlyAmount: "89.00", isEssential: false, icon: "wifi", colour: "#22C55E" },
  ];

  const insertedCats = await db.insert(categories).values(
    categoriesToInsert.map((c) => ({
      ...c,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    }))
  ).returning();

  const groceriesCat = insertedCats.find((c) => c.name.includes("Groceries"))!;
  const diningCat = insertedCats.find((c) => c.name.includes("Dining"))!;
  const mortgageCat = insertedCats.find((c) => c.name.includes("Mortgage"))!;

  // 7. Income Sources
  const [salarySource] = await db
    .insert(incomeSources)
    .values({ name: "Primary Salary (Fortnightly)", amount: "5200.00", receivingAccountId: primaryAccount.id, rrule: "FREQ=WEEKLY;INTERVAL=2", startDate: "2026-07-01", tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  // 8. Income Events
  const todayStr = new Date().toISOString().split("T")[0];
  const [firstIncomeEvent] = await db
    .insert(incomeEvents)
    .values({ incomeSourceId: salarySource.id, expectedDate: "2026-07-01", expectedAmount: "5200.00", actualAmount: "5200.00", status: "CONFIRMED", tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  // 9. Payday Allocation Plan
  const [allocationPlan] = await db
    .insert(allocationPlans)
    .values({ incomeEventId: firstIncomeEvent.id, totalIncomeAmount: "5200.00", status: "CONFIRMED", confirmedAt: new Date("2026-07-01T09:00:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  await db.insert(allocationPlanLines).values([
    { planId: allocationPlan.id, poolId: billsPool.id, proposedAmount: "1859.00", confirmedAmount: "1859.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, poolId: everydayPool.id, proposedAmount: "1200.00", confirmedAmount: "1200.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, poolId: emergencyPool.id, proposedAmount: "500.00", confirmedAmount: "500.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, poolId: kaesavaPrivatePool.id, proposedAmount: "300.00", confirmedAmount: "300.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, poolId: surplusPool.id, proposedAmount: "1341.00", confirmedAmount: "1341.00", tenantId, appId, createdBy: userId, updatedBy: userId },
  ]);

  // 10. Transaction Ledger
  await db.insert(transactionLedger).values([
    { poolId: everydayPool.id, categoryId: groceriesCat.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "1200.00", idempotencyKey: "payday-alloc-everyday-2026-07-01", note: "Payday Allocation — Everyday Pool", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { poolId: billsPool.id, categoryId: mortgageCat.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "1859.00", idempotencyKey: "payday-alloc-bills-2026-07-01", note: "Payday Allocation — Bills Pool", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { poolId: emergencyPool.id, bankAccountId: savingsAccount.id, flowType: "CREDIT", amount: "10000.00", idempotencyKey: "initial-goal-emergency-2026-07-01", note: "Initial Reserve — Emergency Goal", source: "MANUAL", recordedAt: new Date("2026-07-01T09:00:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { poolId: kaesavaPrivatePool.id, bankAccountId: kaesavaPrivateBank.id, flowType: "CREDIT", amount: "300.00", idempotencyKey: "payday-alloc-kaesava-2026-07-01", note: "Payday Allocation — Personal Pool", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { poolId: everydayPool.id, categoryId: groceriesCat.id, bankAccountId: primaryAccount.id, flowType: "DEBIT", amount: "142.50", idempotencyKey: "expense-groceries-debit-2026-07-02", note: "Woolworths Supermarket", source: "MANUAL", recordedAt: new Date("2026-07-02T10:30:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { poolId: everydayPool.id, categoryId: diningCat.id, bankAccountId: primaryAccount.id, flowType: "DEBIT", amount: "48.00", idempotencyKey: "expense-dining-debit-2026-07-04", note: "Local Cafe Brunch", source: "MANUAL", recordedAt: new Date("2026-07-04T09:15:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
  ]);

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
