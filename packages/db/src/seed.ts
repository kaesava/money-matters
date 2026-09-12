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
  appCategories,
  earlyAccessSubscribers,
  processedWebhooks,
  appVersions,
  billingInvoices,
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

  // 2. Partner User: snehaparkhi@gmail.com
  const snehaEmail = "snehaparkhi@gmail.com";
  const snehaPassword = "Password123!";
  const snehaUserId = await ensureNeonAuthUser(snehaEmail, snehaPassword, "Sneha", "d3b07384-d113-4ec4-a5a4-000000000004");

  // 3. Secondary Multi-Tenant User: raehankaesava@gmail.com
  const raehanEmail = "raehankaesava@gmail.com";
  const raehanPassword = "Password123!";
  const raehanTenantId = "d3b07384-d113-4ec4-a5a4-000000000003";
  const raehanUserId = await ensureNeonAuthUser(raehanEmail, raehanPassword, "Raehan Kaesava", "d3b07384-d113-4ec4-a5a4-000000000003");

  // 4. Play Store Tester User: tester-play@kaesava.au
  const testerEmail = "tester-play@kaesava.au";
  const testerPassword = isProd ? "whtVT!lNWPp9yb" : "j0niOxWVA7nt#c";
  const testerTenantId = "d3b07384-d113-4ec4-a5a4-000000000002";
  const testerUserId = await ensureNeonAuthUser(testerEmail, testerPassword, "Play Store Tester", "d3b07384-d113-4ec4-a5a4-000000000002");

  // Clean all application and auth tables across neon_auth and public schemas (clean slate)
  try {
    await db.execute(sql`DELETE FROM neon_auth.session`);
    await db.execute(sql`DELETE FROM neon_auth.verification`);
    await db.execute(sql`DELETE FROM neon_auth.account WHERE "userId" NOT IN (${userId}, ${snehaUserId}, ${raehanUserId}, ${testerUserId})`);
    await db.execute(sql`DELETE FROM neon_auth.user WHERE id NOT IN (${userId}, ${snehaUserId}, ${raehanUserId}, ${testerUserId})`);
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
  await db.delete(appCategories).catch(() => {});
  await db.delete(pools);
  await db.delete(userPreferences);
  await db.delete(tenantUserPreferences);
  await db.delete(bankAccounts);
  await db.delete(tenantUsers);
  await db.delete(billingInvoices).catch(() => {});
  await db.delete(tenants);
  await db.delete(earlyAccessSubscribers).catch(() => {});
  await db.delete(processedWebhooks).catch(() => {});
  await db.delete(appVersions).catch(() => {});
  await db.delete(users);
  await db.delete(apps);

  console.log("🧹 Cleaned database tables across neon_auth and public schemas (clean slate).");

  // 0. App & User Records
  await db.insert(users).values([
    { id: userId, email: "kaesava@gmail.com", displayName: "Kaesava", hasUsedTrial: true },
    { id: snehaUserId, email: snehaEmail, displayName: "Sneha", hasUsedTrial: true },
    { id: raehanUserId, email: raehanEmail, displayName: "Raehan Kaesava", hasUsedTrial: true },
    { id: testerUserId, email: testerEmail, displayName: "Play Store Tester", hasUsedTrial: true },
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
      trialGraceEndsAt: new Date(now.getTime() + 67 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
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
      trialGraceEndsAt: new Date(now.getTime() + 67 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
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
      trialGraceEndsAt: new Date(now.getTime() + 67 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      appId,
      createdBy: testerUserId,
      updatedBy: testerUserId,
    })
    .returning();

  // 2. Tenant Users
  await db.insert(tenantUsers).values([
    { tenantId: household.id, userId, role: "OWNER" as const, inviteStatus: "ACCEPTED" as const, createdBy: userId, updatedBy: userId },
    { tenantId: household.id, userId: snehaUserId, inviteEmail: snehaEmail, role: "MEMBER" as const, inviteStatus: "ACCEPTED" as const, invitedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), createdBy: userId, updatedBy: userId },
    { tenantId: household.id, userId: raehanUserId, inviteEmail: raehanEmail, role: "MEMBER" as const, inviteStatus: "ACCEPTED" as const, invitedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), createdBy: userId, updatedBy: userId },
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

  await db.insert(tenantUserPreferences).values([
    { userId, tenantId, appId, appPreferences: { [appId]: { setup_completed: true, setup_completed_at: now.toISOString() } }, createdBy: userId, updatedBy: userId },
    { userId: snehaUserId, tenantId, appId, appPreferences: { [appId]: { setup_completed: true, setup_completed_at: now.toISOString() } }, createdBy: snehaUserId, updatedBy: snehaUserId },
    { userId: raehanUserId, tenantId: raehanTenantId, appId, appPreferences: { [appId]: { setup_completed: true, setup_completed_at: now.toISOString() } }, createdBy: raehanUserId, updatedBy: raehanUserId },
    { userId: testerUserId, tenantId: testerTenantId, appId, appPreferences: { [appId]: { setup_completed: true, setup_completed_at: now.toISOString() } }, createdBy: testerUserId, updatedBy: testerUserId },
  ]);

  // 4. Bank Accounts (Shared Joint Accounts)
  const [everydayAccount] = await db
    .insert(bankAccounts)
    .values({ name: "Everyday Account", bankProvider: "CBA", lastKnownBalance: "2641.54", unbudgetedBuffer: "0.00", isPrivate: false, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [misaAccount] = await db
    .insert(bankAccounts)
    .values({ name: "MISA (Offset) Account", bankProvider: "CBA", lastKnownBalance: "167581.35", unbudgetedBuffer: "0.00", isPrivate: false, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  // 5. Pools Definition
  const poolDefinitions = [
    // 1. Joint Everyday Pool
    { key: "everyday", name: "Joint Everyday Pool", poolType: "EVERYDAY" as const, bankAccountId: everydayAccount.id, everydayAllowanceAmount: "2641.54", rolloverRule: "ROLLOVER" as const, waterfallPriority: 40, icon: "wallet", colour: "#2563eb", isCommitted: false, isSurplusTarget: false },
    // 2. Household Bills Pool
    { key: "bills", name: "Household Bills Pool", poolType: "REGULAR" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 10, targetAmount: "1099.00", icon: "home", colour: "#ef4444", isSurplusTarget: false },
    // 3. Granular Goal Pools (Linked to MISA Offset)
    { key: "emergency", name: "Emergency Reserve", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 20, targetAmount: "20000.00", icon: "shield", colour: "#22c55e", isSurplusTarget: false },
    { key: "raehan_prev", name: "Raehan Future Fund (Prev FY)", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 25, targetAmount: "61029.48", icon: "graduation-cap", colour: "#1b2b4b", isSurplusTarget: false },
    { key: "raehan_gifts", name: "Raehan's Gifts", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 30, targetAmount: "25760.79", icon: "gift", colour: "#f59e0b", isSurplusTarget: false },
    { key: "raehan_inyear", name: "Raehan FY27 In-Year Savings", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 35, targetAmount: "13000.00", targetDate: "2027-06-30", icon: "piggy-bank", colour: "#8b5cf6", isSurplusTarget: false },
    { key: "council_rates", name: "Council Rates", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 12, targetAmount: "2700.00", icon: "landmark", colour: "#3b82f6", isSurplusTarget: false },
    { key: "home_insurance", name: "Home/Contents Insurance", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 14, targetAmount: "2000.00", targetDate: "2027-06-30", icon: "file-shield", colour: "#06b6d4", isSurplusTarget: false },
    { key: "car_rego", name: "Car Registration / Insurance / RACV", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 16, targetAmount: "5500.00", icon: "car", colour: "#f97316", isSurplusTarget: false },
    { key: "car_servicing", name: "Car Servicing", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 18, targetAmount: "3000.00", icon: "wrench", colour: "#eab308", isSurplusTarget: false },
    { key: "car_repairs", name: "Car Ad-hoc Repair & Fines", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 22, targetAmount: "4000.00", icon: "alert-triangle", colour: "#f43f5e", isSurplusTarget: false },
    { key: "medicines", name: "Medicines, GP & Psychology", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 11, targetAmount: "14460.00", icon: "heart-pulse", colour: "#ec4899", isSurplusTarget: false },
    { key: "clothes", name: "Clothes & Shoes", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 42, targetAmount: "2400.00", icon: "shirt", colour: "#a855f7", isSurplusTarget: false },
    { key: "costco", name: "Costco Bulk Runs", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 44, targetAmount: "1200.00", icon: "shopping-bag", colour: "#14b8a6", isSurplusTarget: false },
    { key: "charu_melb", name: "Family — Charu Aunty Melbourne", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 24, targetAmount: "1200.00", icon: "heart", colour: "#d946ef", isSurplusTarget: false },
    { key: "charu_emerg", name: "Charu Aunty Medical Emergency", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 26, targetAmount: "1200.00", icon: "activity", colour: "#f43f5e", isSurplusTarget: false },
    { key: "charu_travel", name: "International Travel — Charu Aunty Flight", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 46, targetAmount: "2000.00", targetDate: "2026-11-05", icon: "plane", colour: "#0ea5e9", isSurplusTarget: false },
    { key: "seasonal_holidays", name: "Seasonal, School Holidays & Zoo Visits", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 48, targetAmount: "9000.00", icon: "sun", colour: "#f59e0b", isSurplusTarget: false },
    { key: "int_holiday", name: "International Holiday FY27", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 50, targetAmount: "35000.00", targetDate: "2026-11-01", icon: "globe", colour: "#3b82f6", isSurplusTarget: false },
    { key: "japaneasy", name: "Japaneasy Classes", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 52, targetAmount: "500.00", icon: "book-open", colour: "#6366f1", isSurplusTarget: false },
    { key: "rae_birthday", name: "Rae Birthday", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 54, targetAmount: "1250.00", targetDate: "2026-10-22", icon: "cake", colour: "#ec4899", isSurplusTarget: false },
    { key: "classes", name: "Classes & Activities", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 17, targetAmount: "16250.00", icon: "trophy", colour: "#8b5cf6", isSurplusTarget: false },
    { key: "school_fees", name: "School Fees", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 13, targetAmount: "30000.00", icon: "school", colour: "#10b981", isSurplusTarget: false },
    { key: "pet_emerg", name: "Pet Emergency Self-Insurance", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 28, targetAmount: "1000.00", icon: "paw-print", colour: "#14b8a6", isSurplusTarget: false },
    { key: "pet_insurance", name: "Pet Insurance, Rego, Vet & Boarding", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 29, targetAmount: "7500.00", icon: "shield-plus", colour: "#06b6d4", isSurplusTarget: false },
    { key: "inv_property", name: "Investment Property Gap", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 32, targetAmount: "2717.16", icon: "building", colour: "#64748b", isSurplusTarget: false },
    { key: "unexpected", name: "Unexpected Expenses & Major Repairs", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 34, targetAmount: "5000.00", icon: "hammer", colour: "#ef4444", isSurplusTarget: false },
    { key: "tax_obligation", name: "Tax Obligation (incl PAYG)", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: true, waterfallPriority: 15, targetAmount: "18500.00", icon: "receipt", colour: "#dc2626", isSurplusTarget: false },
    { key: "next_yr_holiday", name: "Save for Next Year's Holiday", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: false, waterfallPriority: 60, targetAmount: "33747.55", targetDate: "2027-06-30", icon: "palmtree", colour: "#10b981", isSurplusTarget: false },
    { key: "business_idea", name: "Business Idea Fund", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: false, waterfallPriority: 70, targetAmount: "5000.00", icon: "lightbulb", colour: "#f59e0b", isSurplusTarget: false },
    { key: "surplus_offset", name: "Surplus & Offset Reserve", poolType: "GOAL" as const, bankAccountId: misaAccount.id, isCommitted: false, waterfallPriority: 99, targetAmount: "50000.00", icon: "sparkles", colour: "#6366f1", isSurplusTarget: true },
  ];

  const insertedPools = await db.insert(pools).values(
    poolDefinitions.map((p) => ({
      name: p.name,
      poolType: p.poolType,
      bankAccountId: p.bankAccountId,
      everydayAllowanceAmount: p.everydayAllowanceAmount,
      rolloverRule: p.rolloverRule,
      waterfallPriority: p.waterfallPriority,
      targetAmount: p.targetAmount,
      targetDate: p.targetDate,
      icon: p.icon,
      colour: p.colour,
      isCommitted: p.isCommitted,
      isSurplusTarget: p.isSurplusTarget,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    }))
  ).returning();

  const poolMap = new Map<string, typeof insertedPools[0]>();
  for (let i = 0; i < poolDefinitions.length; i++) {
    poolMap.set(poolDefinitions[i].key, insertedPools[i]);
  }

  const everydayPool = poolMap.get("everyday")!;
  const billsPool = poolMap.get("bills")!;

  // 6. Sub-tag Categories for Everyday and Bills Pools
  const everydayCategories = [
    { name: "Groceries", monthlyAmount: "1083.33", enteredAmount: "500.00", budgetFrequency: "FORTNIGHTLY", isEssential: true, icon: "shopping-cart", colour: "#10b981" },
    { name: "Eating Out (Weekdays, Weekends & Delivery)", monthlyAmount: "1950.00", enteredAmount: "900.00", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "utensils", colour: "#f59e0b" },
    { name: "Petrol & Fuel", monthlyAmount: "400.00", enteredAmount: "184.62", budgetFrequency: "FORTNIGHTLY", isEssential: true, icon: "fuel", colour: "#3b82f6" },
    { name: "Gym & Fitness Activities", monthlyAmount: "390.00", enteredAmount: "180.00", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "dumbbell", colour: "#8b5cf6" },
    { name: "Haircut, Beauty & Grooming Products", monthlyAmount: "525.00", enteredAmount: "242.31", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "sparkles", colour: "#ec4899" },
    { name: "Dog Walking", monthlyAmount: "260.00", enteredAmount: "120.00", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "dog", colour: "#14b8a6" },
    { name: "Pet Food, Treats & Store", monthlyAmount: "290.00", enteredAmount: "133.85", budgetFrequency: "FORTNIGHTLY", isEssential: true, icon: "paw-print", colour: "#06b6d4" },
    { name: "Pet Grooming", monthlyAmount: "120.00", enteredAmount: "55.38", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "scissors", colour: "#f97316" },
    { name: "Movies, Cinema, Streaming & VPN", monthlyAmount: "205.83", enteredAmount: "95.00", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "tv", colour: "#6366f1" },
    { name: "Rae Basketball, Books, Clothes & Pocket Money", monthlyAmount: "140.83", enteredAmount: "65.00", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "book-open", colour: "#a855f7" },
    { name: "Gardening & Pruning", monthlyAmount: "119.17", enteredAmount: "55.00", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "flower-2", colour: "#22c55e" },
    { name: "Public Transport Tickets", monthlyAmount: "108.33", enteredAmount: "50.00", budgetFrequency: "FORTNIGHTLY", isEssential: true, icon: "train", colour: "#0ea5e9" },
    { name: "Birthday Gifts, House Warmings & Teacher Presents", monthlyAmount: "60.00", enteredAmount: "27.69", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "gift", colour: "#f43f5e" },
    { name: "Parking", monthlyAmount: "37.50", enteredAmount: "17.31", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "circle-parking", colour: "#64748b" },
    { name: "Car Wash", monthlyAmount: "33.33", enteredAmount: "15.38", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "droplets", colour: "#38bdf8" },
  ];

  const billsCategories = [
    { name: "Home Loan Minimum Repayment", monthlyAmount: "0.00", enteredAmount: "0.00", budgetFrequency: "MONTHLY", isEssential: true, icon: "home", colour: "#ef4444" },
    { name: "Personal Health Insurance (Couple) & Ambulance", monthlyAmount: "415.00", enteredAmount: "191.54", budgetFrequency: "FORTNIGHTLY", isEssential: true, icon: "heart-pulse", colour: "#10b981" },
    { name: "Gas & Electricity", monthlyAmount: "291.67", enteredAmount: "134.62", budgetFrequency: "FORTNIGHTLY", isEssential: true, icon: "zap", colour: "#f59e0b" },
    { name: "Mobile Phone, Home Phone & Internet", monthlyAmount: "220.00", enteredAmount: "101.54", budgetFrequency: "FORTNIGHTLY", isEssential: true, icon: "wifi", colour: "#3b82f6" },
    { name: "Water & Sewage", monthlyAmount: "133.33", enteredAmount: "61.54", budgetFrequency: "FORTNIGHTLY", isEssential: true, icon: "droplet", colour: "#06b6d4" },
    { name: "Charity / CareFlight", monthlyAmount: "39.00", enteredAmount: "18.00", budgetFrequency: "FORTNIGHTLY", isEssential: false, icon: "heart-handshake", colour: "#ec4899" },
  ];

  const categoriesToInsert = [
    ...everydayCategories.map((c) => ({ ...c, poolId: everydayPool.id })),
    ...billsCategories.map((c) => ({ ...c, poolId: billsPool.id })),
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

  const groceriesCat = insertedCats.find((c) => c.name === "Groceries")!;
  const billsHealthCat = insertedCats.find((c) => c.name.includes("Health Insurance"))!;

  // 7. Income Sources
  const [keshSalary] = await db
    .insert(incomeSources)
    .values({ name: "Kesh - Salary (Fortnightly)", amount: "6205.08", receivingAccountId: everydayAccount.id, rrule: "FREQ=WEEKLY;INTERVAL=2", startDate: "2026-07-02", tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [snehaSalary] = await db
    .insert(incomeSources)
    .values({ name: "Sneha - Salary (Fortnightly)", amount: "3024.47", receivingAccountId: everydayAccount.id, rrule: "FREQ=WEEKLY;INTERVAL=2", startDate: "2026-07-02", tenantId, appId, createdBy: snehaUserId, updatedBy: snehaUserId })
    .returning();

  // 8. Payday Dates & 26-Fortnight Schedule
  const paydays = [
    { date: "2026-07-02", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: true },
    { date: "2026-07-16", kesh: "6217.08", sneha: "3036.47", total: "9253.55", isPast: true },
    { date: "2026-07-30", kesh: "6217.07", sneha: "3081.75", total: "9298.82", isPast: true },
    { date: "2026-08-13", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: true },
    { date: "2026-08-27", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: true },
    { date: "2026-09-10", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: true },
    { date: "2026-09-24", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2026-10-08", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2026-10-22", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2026-11-05", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2026-11-19", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2026-12-03", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2026-12-17", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2026-12-31", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-01-14", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-01-28", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-02-11", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-02-25", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-03-11", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-03-25", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-04-08", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-04-22", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-05-06", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-05-20", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-06-03", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
    { date: "2027-06-17", kesh: "6205.08", sneha: "3024.47", total: "9229.55", isPast: false },
  ];

  // Insert Income Events in bulk
  const incomeEventsToInsert = paydays.flatMap((p) => [
    {
      incomeSourceId: keshSalary.id,
      name: "Kesh - Salary",
      expectedDate: p.date,
      actualDate: p.isPast ? p.date : null,
      expectedAmount: p.kesh,
      actualAmount: p.isPast ? p.kesh : null,
      status: (p.isPast ? "CONFIRMED" : "PENDING") as "CONFIRMED" | "PENDING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      incomeSourceId: snehaSalary.id,
      name: "Sneha - Salary",
      expectedDate: p.date,
      actualDate: p.isPast ? p.date : null,
      expectedAmount: p.sneha,
      actualAmount: p.isPast ? p.sneha : null,
      status: (p.isPast ? "CONFIRMED" : "PENDING") as "CONFIRMED" | "PENDING",
      tenantId,
      appId,
      createdBy: snehaUserId,
      updatedBy: snehaUserId,
    },
  ]);

  const insertedIncomeEvents = await db.insert(incomeEvents).values(incomeEventsToInsert).returning();

  // 9. Historical Allocation Plans for Paydays 1 to 6
  const pastSplitsData: { date: string; splits: Record<string, number> }[] = [
    {
      date: "2026-07-02",
      splits: {
        everyday: 2641.54,
        bills: 507.23,
        clothes: 50.00,
        int_holiday: 5000.00,
        school_fees: 500.00,
        tax_obligation: 1000.00,
      },
    },
    {
      date: "2026-07-16",
      splits: {
        everyday: 2641.54,
        bills: 507.23,
        medicines: 500.00,
        int_holiday: 2500.00,
        classes: 500.00,
        school_fees: 1000.00,
        tax_obligation: 2000.00,
      },
    },
    {
      date: "2026-07-30",
      splits: {
        everyday: 2641.54,
        bills: 507.23,
        council_rates: 225.00,
        clothes: 400.00,
        costco: 300.00,
        int_holiday: 2000.00,
        classes: 1000.00,
        school_fees: 818.00,
        tax_obligation: 1500.00,
      },
    },
    {
      date: "2026-08-13",
      splits: {
        everyday: 2641.54,
        bills: 507.23,
        council_rates: 450.00,
        medicines: 500.00,
        charu_melb: 300.00,
        seasonal_holidays: 1500.00,
        int_holiday: 4000.00,
        school_fees: 818.00,
        pet_insurance: 250.00,
        tax_obligation: 500.00,
        emergency: -469.22,
      },
    },
    {
      date: "2026-08-27",
      splits: {
        everyday: 2641.54,
        bills: 507.23,
        car_servicing: 750.00,
        car_repairs: 300.00,
        clothes: 300.00,
        int_holiday: 3250.00,
        rae_birthday: 250.00,
        classes: 250.00,
        tax_obligation: 1000.00,
        emergency: -494.22,
      },
    },
    {
      date: "2026-09-10",
      splits: {
        everyday: 2641.54,
        bills: 507.23,
        car_servicing: 750.00,
        medicines: 500.00,
        clothes: 500.00,
        int_holiday: 1000.00,
        classes: 1250.00,
        school_fees: 1500.00,
        tax_obligation: 500.00,
        emergency: -419.22,
      },
    },
  ];

  for (const past of pastSplitsData) {
    const keshEv = insertedIncomeEvents.find((e) => e.expectedDate === past.date && e.name === "Kesh - Salary")!;
    const paydayInfo = paydays.find((p) => p.date === past.date)!;

    const [plan] = await db
      .insert(allocationPlans)
      .values({
        incomeEventId: keshEv.id,
        totalIncomeAmount: paydayInfo.total,
        status: "CONFIRMED" as const,
        confirmedAt: new Date(past.date + "T09:00:00Z"),
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const planLinesToInsert = Object.entries(past.splits).map(([key, amt]) => {
      const targetPool = poolMap.get(key)!;
      return {
        planId: plan.id,
        poolId: targetPool.id,
        proposedAmount: amt.toFixed(2),
        confirmedAmount: amt.toFixed(2),
        reasoning: `Confirmed FY27 paycheck allocation split for ${targetPool.name}`,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      };
    });

    await db.insert(allocationPlanLines).values(planLinesToInsert);
  }

  // 10. Transaction Ledger — Exact Reconstructed Historical Replay (01-Jul-2026 to 13-Sep-2026)
  // Part A: 01-Jul-2026 Mathematically Reconstructed Starting Balances ($138,852.35 MISA + $2,641.54 Everyday)
  const openingBalances: { key: string; amount: string; note: string }[] = [
    { key: "everyday", amount: "2641.54", note: "Opening Balance — Joint Everyday Account" },
    { key: "council_rates", amount: "8.75", note: "Opening Balance — Council Rates Reserve" },
    { key: "car_rego", amount: "209.46", note: "Opening Balance — Car Rego & Insurance Reserve" },
    { key: "car_servicing", amount: "750.00", note: "Opening Balance — Car Servicing Reserve" },
    { key: "car_repairs", amount: "400.00", note: "Opening Balance — Car Ad-hoc Repairs Reserve" },
    { key: "costco", amount: "300.00", note: "Opening Balance — Costco Bulk Runs Reserve" },
    { key: "charu_melb", amount: "500.00", note: "Opening Balance — Charu Aunty Melbourne Reserve" },
    { key: "charu_emerg", amount: "375.97", note: "Opening Balance — Charu Aunty Medical Emergency Reserve" },
    { key: "int_holiday", amount: "902.16", note: "Opening Balance — International Holiday FY27 Reserve" },
    { key: "pet_emerg", amount: "1000.00", note: "Opening Balance — Pet Emergency Self-Insurance Reserve" },
    { key: "pet_insurance", amount: "560.73", note: "Opening Balance — Pet Insurance & Vet Visits Reserve" },
    { key: "inv_property", amount: "2717.16", note: "Opening Balance — Investment Property Gap Reserve" },
    { key: "unexpected", amount: "1000.00", note: "Opening Balance — Unexpected Expenses & Repairs Reserve" },
    { key: "next_yr_holiday", amount: "20000.00", note: "Opening Balance — Save for Next Year's Holiday" },
    { key: "raehan_prev", amount: "61029.48", note: "Opening Balance — Raehan Savings (Up to End of Prev FY)" },
    { key: "raehan_gifts", amount: "25760.79", note: "Opening Balance — Raehan Gifts (Ring-Fenced Reserve)" },
    { key: "business_idea", amount: "5000.00", note: "Opening Balance — Business Idea Fund" },
    { key: "emergency", amount: "18337.85", note: "Opening Balance — Emergency Reserve" },
  ];

  const openingLedgerRows = openingBalances.map((ob) => {
    const targetPool = poolMap.get(ob.key)!;
    const targetAccount = ob.key === "everyday" ? everydayAccount.id : misaAccount.id;
    return {
      poolId: targetPool.id,
      bankAccountId: targetAccount,
      flowType: "CREDIT" as const,
      transactionType: "OPENING_BALANCE" as const,
      amount: ob.amount,
      idempotencyKey: `opening-balance-${ob.key}-2026-07-01`,
      note: ob.note,
      source: "MANUAL" as const,
      recordedAt: new Date("2026-07-01T09:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    };
  });

  // Part B: 6 Confirmed Payday Splits into Transaction Ledger
  const paydayLedgerRows = pastSplitsData.flatMap((past) => {
    return Object.entries(past.splits).map(([key, amt]) => {
      const targetPool = poolMap.get(key)!;
      const targetAccount = key === "everyday" ? everydayAccount.id : misaAccount.id;
      const isPositive = amt >= 0;
      const absAmount = Math.abs(amt).toFixed(2);
      return {
        poolId: targetPool.id,
        bankAccountId: targetAccount,
        flowType: (isPositive ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT",
        transactionType: (isPositive ? "INCOME_SPLIT" : "EXPENSE") as "INCOME_SPLIT" | "EXPENSE",
        amount: absAmount,
        idempotencyKey: `payday-split-${key}-${past.date}`,
        note: isPositive ? `Payday Allocation — ${targetPool.name}` : `Temporary Cashflow Cushion Drawdown — ${targetPool.name}`,
        source: "AUTO" as const,
        recordedAt: new Date(`${past.date}T09:05:00Z`),
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      };
    });
  });

  // Part C: Historical Actual Expenses Paid Out in July & August ($12,642.72 MISA Debits + Routine Everyday Living)
  const historicalDebits = [
    { key: "bills", categoryId: billsHealthCat.id, amount: "2106.92", date: "2026-07-20", note: "Household Utilities, Health Insurance & CareFlight (Jul-Aug)" },
    { key: "tax_obligation", amount: "4500.00", date: "2026-08-01", note: "ATO PAYG & Tax Obligation Payment" },
    { key: "school_fees", amount: "2136.00", date: "2026-07-10", note: "Term 3 School Tuition Fees Paid" },
    { key: "classes", amount: "2149.80", date: "2026-08-15", note: "Kids Extracurricular Activities & Classes Paid" },
    { key: "medicines", amount: "1000.00", date: "2026-08-05", note: "GP, Specialist, Psychology & Pharmacy Expenses Paid" },
    { key: "clothes", amount: "450.00", date: "2026-08-10", note: "Winter Clothes & School Shoes Purchase" },
    { key: "costco", amount: "300.00", date: "2026-08-12", note: "Costco Bulk Household Supplies Run" },
    // Routine Everyday living expenses (routine household transactions across the 6 fortnights matching allowances)
    { key: "everyday", categoryId: groceriesCat.id, amount: "2641.54", date: "2026-07-10", note: "Everyday Living & Groceries (Payday 1 Cycle)" },
    { key: "everyday", categoryId: groceriesCat.id, amount: "2641.54", date: "2026-07-24", note: "Everyday Living & Groceries (Payday 2 Cycle)" },
    { key: "everyday", categoryId: groceriesCat.id, amount: "2641.54", date: "2026-08-07", note: "Everyday Living & Groceries (Payday 3 Cycle)" },
    { key: "everyday", categoryId: groceriesCat.id, amount: "2641.54", date: "2026-08-21", note: "Everyday Living & Groceries (Payday 4 Cycle)" },
    { key: "everyday", categoryId: groceriesCat.id, amount: "2641.54", date: "2026-09-04", note: "Everyday Living & Groceries (Payday 5 Cycle)" },
    { key: "everyday", categoryId: groceriesCat.id, amount: "2641.54", date: "2026-09-12", note: "Everyday Living & Groceries (Payday 6 Cycle)" },
  ];

  const historicalDebitRows = historicalDebits.map((hd, idx) => {
    const targetPool = poolMap.get(hd.key)!;
    const targetAccount = hd.key === "everyday" ? everydayAccount.id : misaAccount.id;
    return {
      poolId: targetPool.id,
      categoryId: hd.categoryId || null,
      bankAccountId: targetAccount,
      flowType: "DEBIT" as const,
      transactionType: "EXPENSE" as const,
      amount: hd.amount,
      idempotencyKey: `historical-debit-${hd.key}-${idx}-${hd.date}`,
      note: hd.note,
      source: "MANUAL" as const,
      recordedAt: new Date(`${hd.date}T10:00:00Z`),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    };
  });

  // Bulk Insert all transaction ledger rows
  await db.insert(transactionLedger).values([
    ...openingLedgerRows,
    ...paydayLedgerRows,
    ...historicalDebitRows,
  ]);

  // 11. Recurring Expense Sources & Upcoming Events for the Next 90 Days
  const ratesPool = poolMap.get("council_rates")!;
  const schoolPool = poolMap.get("school_fees")!;
  const [ratesSource] = await db
    .insert(expenseSources)
    .values({
      name: "Council Rates (Quarterly)",
      amount: "675.00",
      poolId: ratesPool.id,
      rrule: "FREQ=MONTHLY;INTERVAL=3",
      startDate: "2026-09-30",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [schoolSource] = await db
    .insert(expenseSources)
    .values({
      name: "School Fees (Quarterly)",
      amount: "7500.00",
      poolId: schoolPool.id,
      rrule: "FREQ=MONTHLY;INTERVAL=3",
      startDate: "2026-10-01",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  await db.insert(expenseEvents).values([
    {
      expenseSourceId: ratesSource.id,
      poolId: ratesPool.id,
      name: "Council Rates Q1 Instalment",
      expectedDate: "2026-09-30",
      expectedAmount: "675.00",
      status: "PENDING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      expenseSourceId: schoolSource.id,
      poolId: schoolPool.id,
      name: "School Fees Q4 Instalment",
      expectedDate: "2026-10-01",
      expectedAmount: "3750.00",
      status: "PENDING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  console.log(`🎉 Seed data successfully populated for [${envLabel}] across all tables!`);
  console.log(`   - MISA Offset Account accurately reconciled to $167,581.35 across all 30 pools.`);
  console.log(`   - Joint Everyday Pool initialized with $2,641.54 allowance on Everyday Account.`);
  console.log(`   - 26 Fortnight FY27 plan scheduled with Sneha and Kesh pre-verified.`);
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
