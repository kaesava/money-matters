import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  tenants,
  tenantUsers,
  bankAccounts,
  bankAccountCategoryMappings,
  categories,
  categorySchedules,
  incomeSources,
  incomeEvents,
  allocationPlans,
  allocationPlanLines,
  transactionLedger,
  expenseSources,
  expenseEvents,
  userPreferences,
  users,
  apps,
  fileNotes,
  deviceTokens,
} from "@money-matters/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
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

  // 1. Primary User: kaesava@gmail.com
  const tenantId = "d3b07384-d113-4ec4-a5a4-000000000001";
  let userId = "d3b07384-d113-4ec4-a5a4-000000000001";

  let existingNeonUsers: any[] = [];
  try {
    const res = await db.execute<{ id: string; email: string }>(
      sql`SELECT id, email FROM neon_auth.user WHERE email = 'kaesava@gmail.com' LIMIT 1`
    );
    existingNeonUsers = Array.isArray(res) ? res : (res as any)?.rows ?? [];
  } catch (e) {
    console.log("Note: neon_auth.user table check skipped or schema not initialized.");
  }

  const existingNeonUser = existingNeonUsers[0];
  if (existingNeonUser) {
    userId = existingNeonUser.id;
    console.log(`Found existing Neon Auth user for kaesava@gmail.com with ID: ${userId}`);
    await db.execute(sql`UPDATE neon_auth.user SET "emailVerified" = true WHERE id = ${userId}`);
  } else {
    console.log(`Inserting seed user into neon_auth.user for kaesava@gmail.com...`);
    try {
      const existingByIdRes = await db.execute(
        sql`SELECT id FROM neon_auth.user WHERE id = ${userId} LIMIT 1`
      );
      const hasId = Array.isArray(existingByIdRes) ? existingByIdRes.length > 0 : (existingByIdRes as any)?.rows?.length > 0;
      if (hasId) {
        userId = randomUUID();
      }
      await db.execute(sql`
        INSERT INTO neon_auth.user (id, name, email, "emailVerified", "createdAt", "updatedAt")
        VALUES (${userId}, 'Kaesava', 'kaesava@gmail.com', true, now(), now())
      `);
    } catch (e) {
      console.log("neon_auth.user insert bypassed.");
    }
  }

  // 2. Secondary Multi-Tenant User: raehankaesava@gmail.com
  const raehanEmail = "raehankaesava@gmail.com";
  const raehanTenantId = "d3b07384-d113-4ec4-a5a4-000000000003";
  let raehanUserId = "d3b07384-d113-4ec4-a5a4-000000000003";

  let existingRaehanUsers: any[] = [];
  try {
    const res = await db.execute<{ id: string; email: string }>(
      sql`SELECT id, email FROM neon_auth.user WHERE email = ${raehanEmail} LIMIT 1`
    );
    existingRaehanUsers = Array.isArray(res) ? res : (res as any)?.rows ?? [];
  } catch (e) {
    console.log("Note: neon_auth.user table check for raehan skipped.");
  }

  const existingRaehanUser = existingRaehanUsers[0];
  if (existingRaehanUser) {
    raehanUserId = existingRaehanUser.id;
    console.log(`Found existing Neon Auth user for ${raehanEmail} with ID: ${raehanUserId}`);
    await db.execute(sql`UPDATE neon_auth.user SET "emailVerified" = true WHERE id = ${raehanUserId}`);
  } else {
    console.log(`Inserting seed user into neon_auth.user for ${raehanEmail}...`);
    try {
      const existingByIdRes = await db.execute(
        sql`SELECT id FROM neon_auth.user WHERE id = ${raehanUserId} LIMIT 1`
      );
      const hasId = Array.isArray(existingByIdRes) ? existingByIdRes.length > 0 : (existingByIdRes as any)?.rows?.length > 0;
      if (hasId) {
        raehanUserId = randomUUID();
      }
      await db.execute(sql`
        INSERT INTO neon_auth.user (id, name, email, "emailVerified", "createdAt", "updatedAt")
        VALUES (${raehanUserId}, 'Raehan Kaesava', ${raehanEmail}, true, now(), now())
      `);
    } catch (e) {
      console.log("neon_auth.user insert for raehan bypassed.");
    }
  }

  // 3. Play Store Tester User: tester-play@kaesava.au
  const testerEmail = "tester-play@kaesava.au";
  const testerPassword = isProd ? "whtVT!lNWPp9yb" : "j0niOxWVA7nt#c";
  const testerTenantId = "d3b07384-d113-4ec4-a5a4-000000000002";
  let testerUserId = "d3b07384-d113-4ec4-a5a4-000000000002";

  console.log(`Setting up Neon Auth user for ${testerEmail} (Env: ${isProd ? "PROD" : "DEV"})...`);

  try {
    await db.execute(sql`DELETE FROM neon_auth.user WHERE email = ${testerEmail}`);
  } catch (e) {
    console.log("Pre-existing neon_auth record cleanup bypassed.");
  }

  const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || (isProd ? "https://ep-spring-snow-a70f61xz.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth" : "https://ep-icy-resonance-a7s94hg4.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth");
  const originUrl = isProd ? "https://moneymatters.kaesava.au" : "http://localhost:3000";

  try {
    const signupRes = await fetch(`${authUrl}/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": originUrl },
      body: JSON.stringify({
        email: testerEmail,
        password: testerPassword,
        name: "Play Store Tester",
      }),
    });

    if (signupRes.ok) {
      const body = (await signupRes.json()) as any;
      if (body.user?.id) {
        testerUserId = body.user.id;
      }
      console.log(`Registered ${testerEmail} via Neon Auth REST API. User ID: ${testerUserId}`);
    } else {
      console.log(`Neon Auth REST API status ${signupRes.status}, fallback to direct insert.`);
    }
  } catch (e) {
    console.log("Neon Auth API unavailable, proceeding with direct insert.");
  }

  try {
    const existingTesterRes = await db.execute<{ id: string }>(
      sql`SELECT id FROM neon_auth.user WHERE email = ${testerEmail} LIMIT 1`
    );
    const rows = Array.isArray(existingTesterRes) ? existingTesterRes : (existingTesterRes as any)?.rows ?? [];
    if (rows.length > 0) {
      testerUserId = rows[0].id;
      await db.execute(sql`UPDATE neon_auth.user SET "emailVerified" = true WHERE email = ${testerEmail}`);
    } else {
      await db.execute(sql`
        INSERT INTO neon_auth.user (id, name, email, "emailVerified", "createdAt", "updatedAt")
        VALUES (${testerUserId}, 'Play Store Tester', ${testerEmail}, true, now(), now())
      `);
    }
    console.log(`Marked emailVerified = true for ${testerEmail} in neon_auth.user.`);
  } catch (e) {
    console.log("neon_auth.user update/insert skipped.");
  }

  // Ensure DB schema migrations/columns are present
  await db.execute(sql`DROP TABLE IF EXISTS expense_source_schedules CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS income_source_schedules CASCADE`);
  await db.execute(sql`ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS rrule VARCHAR(255), ADD COLUMN IF NOT EXISTS start_date DATE, ADD COLUMN IF NOT EXISTS end_date DATE`);
  await db.execute(sql`ALTER TABLE expense_sources ADD COLUMN IF NOT EXISTS rrule VARCHAR(255), ADD COLUMN IF NOT EXISTS start_date DATE, ADD COLUMN IF NOT EXISTS end_date DATE`);
  await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS everyday_allowance_amount NUMERIC(12,2)`);
  await db.execute(sql`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL, ADD COLUMN IF NOT EXISTS user_id UUID`);

  // Clean all application tables in strict dependency order
  await db.delete(fileNotes);
  await db.delete(deviceTokens);
  await db.delete(transactionLedger);
  await db.delete(allocationPlanLines);
  await db.delete(allocationPlans);
  await db.delete(expenseEvents);
  await db.delete(expenseSources);
  await db.delete(incomeEvents);
  await db.delete(incomeSources);
  await db.delete(categorySchedules);
  await db.delete(categories);
  await db.delete(userPreferences);
  await db.delete(bankAccountCategoryMappings);
  await db.delete(bankAccounts);
  await db.delete(tenantUsers);
  await db.delete(tenants);
  await db.delete(users);
  await db.delete(apps);

  console.log("🧹 Cleaned database tables.");

  // 0. App & User Records
  await db.insert(users).values([
    {
      id: userId,
      email: "kaesava@gmail.com",
      displayName: "Kaesava",
    },
    {
      id: raehanUserId,
      email: raehanEmail,
      displayName: "Raehan Kaesava",
    },
    {
      id: testerUserId,
      email: testerEmail,
      displayName: "Play Store Tester",
    },
  ]);

  await db.insert(apps).values({
    id: appId,
    name: "Money Matters",
    slug: "money-matters",
  });

  // 1. Tenants (Kaesava Household & Raehan Household)
  const now = new Date();
  const [household] = await db
    .insert(tenants)
    .values({
      id: tenantId,
      name: "Kaesava Household",
      fyEndMonthDay: "06-30",
      premiumEnabled: true,
      subscriptionStatus: "TRIAL_ACTIVE",
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      trialGraceEndsAt: new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000),
      tenantId,
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
      fyEndMonthDay: "06-30",
      premiumEnabled: true,
      subscriptionStatus: "TRIAL_ACTIVE",
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      trialGraceEndsAt: new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000),
      tenantId: raehanTenantId,
      appId,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    })
    .returning();

  // 2. Tenant Users (Multi-tenant memberships)
  await db.insert(tenantUsers).values([
    // Kaesava Household: kaesava (OWNER), raehan (MEMBER invited by kaesava)
    {
      tenantId: household.id,
      userId,
      role: "OWNER" as const,
      inviteStatus: "ACCEPTED" as const,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      tenantId: household.id,
      userId: raehanUserId,
      inviteEmail: raehanEmail,
      role: "MEMBER" as const,
      inviteStatus: "ACCEPTED" as const,
      invitedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    // Raehan Household: raehan (OWNER), kaesava (MEMBER invited by raehan)
    {
      tenantId: raehanHousehold.id,
      userId: raehanUserId,
      role: "OWNER" as const,
      inviteStatus: "ACCEPTED" as const,
      appId,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
    {
      tenantId: raehanHousehold.id,
      userId,
      inviteEmail: "kaesava@gmail.com",
      role: "MEMBER" as const,
      inviteStatus: "ACCEPTED" as const,
      invitedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      appId,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
  ]);

  // 3. User Preferences
  await db.insert(userPreferences).values([
    {
      userId,
      tenantId,
      timezone: "Australia/Sydney",
      paydayAlertsEnabled: true,
      shortfallAlertsEnabled: true,
      billRemindersEnabled: true,
      weeklyDigestEnabled: true,
      appPreferences: {
        [appId]: {
          quick_actions_collapsed: false,
        },
      },
    },
    {
      userId: raehanUserId,
      tenantId: raehanTenantId,
      timezone: "Australia/Sydney",
      paydayAlertsEnabled: true,
      shortfallAlertsEnabled: true,
      billRemindersEnabled: true,
      weeklyDigestEnabled: true,
      appPreferences: {
        [appId]: {
          quick_actions_collapsed: false,
        },
      },
    },
  ]);

  // 4. Bank Accounts
  const [primaryAccount] = await db
    .insert(bankAccounts)
    .values({
      name: "Primary Account",
      lastKnownBalance: "3450.00",
      unbudgetedBuffer: "500.00",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [savingsAccount] = await db
    .insert(bankAccounts)
    .values({
      name: "High Interest Offset Saver",
      lastKnownBalance: "48500.00",
      unbudgetedBuffer: "0.00",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  // Raehan Household Bank Accounts
  const [raehanPrimaryAccount] = await db
    .insert(bankAccounts)
    .values({
      name: "Everyday Smart Account",
      lastKnownBalance: "5200.00",
      unbudgetedBuffer: "400.00",
      tenantId: raehanTenantId,
      appId,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    })
    .returning();

  const [raehanSavingsAccount] = await db
    .insert(bankAccounts)
    .values({
      name: "Wealth Builder Saver",
      lastKnownBalance: "24000.00",
      unbudgetedBuffer: "0.00",
      tenantId: raehanTenantId,
      appId,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    })
    .returning();

  // Link Category Types to Bank Accounts
  await db.insert(bankAccountCategoryMappings).values([
    {
      tenantId,
      appId,
      categoryType: "EVERYDAY" as const,
      bankAccountId: primaryAccount.id,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      tenantId,
      appId,
      categoryType: "REGULAR" as const,
      bankAccountId: primaryAccount.id,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      tenantId,
      appId,
      categoryType: "PERSONAL" as const,
      bankAccountId: primaryAccount.id,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      tenantId,
      appId,
      categoryType: "GOAL" as const,
      bankAccountId: savingsAccount.id,
      createdBy: userId,
      updatedBy: userId,
    },
    // Raehan Household mappings
    {
      tenantId: raehanTenantId,
      appId,
      categoryType: "EVERYDAY" as const,
      bankAccountId: raehanPrimaryAccount.id,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
    {
      tenantId: raehanTenantId,
      appId,
      categoryType: "REGULAR" as const,
      bankAccountId: raehanPrimaryAccount.id,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
    {
      tenantId: raehanTenantId,
      appId,
      categoryType: "PERSONAL" as const,
      bankAccountId: raehanPrimaryAccount.id,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
    {
      tenantId: raehanTenantId,
      appId,
      categoryType: "GOAL" as const,
      bankAccountId: raehanSavingsAccount.id,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
  ]);

  // 5. Canonical Categories
  const canonicalCategories = [
    // EVERYDAY (Discretionary pooled spending)
    {
      key: "groceries",
      name: "Groceries & Food Supplies",
      type: "EVERYDAY" as const,
      isCommitted: false,
      excess: false,
      icon: "shopping-cart",
      color: "#10B981",
      monthlyAmount: "1170.00",
    },
    {
      key: "dining",
      name: "Dining Out & Coffee",
      type: "EVERYDAY" as const,
      isCommitted: false,
      excess: false,
      icon: "coffee",
      color: "#F59E0B",
      monthlyAmount: "1040.00",
    },
    {
      key: "petrol",
      name: "Petrol & Fuel",
      type: "EVERYDAY" as const,
      isCommitted: false,
      excess: false,
      icon: "navigation",
      color: "#3B82F6",
      monthlyAmount: "260.00",
    },
    {
      key: "transport",
      name: "Public Transport & Rideshare",
      type: "EVERYDAY" as const,
      isCommitted: false,
      excess: false,
      icon: "truck",
      color: "#8B5CF6",
      monthlyAmount: "180.00",
    },
    {
      key: "personal",
      name: "Personal Care & Fun",
      type: "EVERYDAY" as const,
      isCommitted: false,
      excess: false,
      icon: "smile",
      color: "#EC4899",
      monthlyAmount: "430.00",
    },
    {
      key: "everyday",
      name: "Everyday Incidental Buffer",
      type: "EVERYDAY" as const,
      isCommitted: false,
      excess: true,
      icon: "wallet",
      color: "#00B4A6",
      allowance: "300.00",
    },

    // PERSONAL (Stealth Privacy Allowances - Step 3b Waterfall)
    {
      key: "kaesava_personal",
      name: "Kaesava Personal Fund",
      type: "PERSONAL" as const,
      isCommitted: false,
      excess: false,
      icon: "user",
      color: "#3B82F6",
      allowance: "300.00",
    },
    {
      key: "raehan_personal",
      name: "Raehan Personal Fund",
      type: "PERSONAL" as const,
      isCommitted: false,
      excess: false,
      icon: "user-check",
      color: "#EC4899",
      allowance: "300.00",
    },

    // REGULAR (Fixed obligations / bills)
    {
      key: "mortgage",
      name: "Mortgage / Rent Payment",
      type: "REGULAR" as const,
      isCommitted: false,
      excess: false,
      icon: "home",
      color: "#EF4444",
      monthlyAmount: "3200.00",
    },
    {
      key: "electricity",
      name: "Electricity & Gas (AGL)",
      type: "REGULAR" as const,
      isCommitted: false,
      excess: false,
      icon: "zap",
      color: "#F59E0B",
      monthlyAmount: "340.00",
    },
    {
      key: "broadband",
      name: "NBN Broadband (Aussie Broadband)",
      type: "REGULAR" as const,
      isCommitted: false,
      excess: false,
      icon: "wifi",
      color: "#22C55E",
      monthlyAmount: "89.00",
    },
    {
      key: "health",
      name: "Private Health Insurance (Bupa)",
      type: "REGULAR" as const,
      isCommitted: false,
      excess: false,
      icon: "heart-pulse",
      color: "#EC4899",
      monthlyAmount: "280.00",
    },
    {
      key: "subscriptions",
      name: "Streaming & Subscriptions",
      type: "REGULAR" as const,
      isCommitted: false,
      excess: false,
      icon: "tv",
      color: "#8B5CF6",
      monthlyAmount: "65.00",
    },

    // GOAL (Target Savings Pools)
    {
      key: "surplus_reserve",
      name: "Surplus & Offset Reserve",
      type: "GOAL" as const,
      isCommitted: false,
      isSurplusTarget: true,
      icon: "bank",
      color: "#00B4A6",
      target: null,
      due: null,
    },
    {
      key: "emergency",
      name: "Emergency Reserve (6 Mo Buffer)",
      type: "GOAL" as const,
      isCommitted: true,
      excess: true,
      icon: "shield",
      color: "#EF4444",
      target: "15000.00",
      due: "2026-12-31",
    },
    {
      key: "car",
      name: "Car Rego, Service & Tyres",
      type: "GOAL" as const,
      isCommitted: true,
      excess: false,
      icon: "tool",
      color: "#F59E0B",
      target: "2400.00",
      due: "2027-03-31",
    },
    {
      key: "holiday",
      name: "Annual Family Holiday (Japan 2026)",
      type: "GOAL" as const,
      isCommitted: false,
      excess: false,
      isSavingsDefault: false,
      icon: "plane",
      color: "#00B4A6",
      target: "8500.00",
      due: "2026-11-30",
    },
    {
      key: "home_maint",
      name: "Home Repairs & Appliance Fund",
      type: "GOAL" as const,
      isCommitted: false,
      excess: false,
      icon: "hammer",
      color: "#6366F1",
      target: "5000.00",
      due: "2027-06-30",
    },
  ];

  const insertedCatMap: Record<string, any> = {};

  for (const cat of canonicalCategories) {
    const isEssential = cat.key === "mortgage" || cat.key === "electricity";
    const isSurplusTarget = Boolean((cat as any).isSurplusTarget);

    const [inserted] = await db
      .insert(categories)
      .values({
        name: cat.name,
        type: cat.type,
        userId: cat.type === "PERSONAL" ? (cat.key === "kaesava_personal" ? userId : raehanUserId) : null,
        isCommitted: cat.isCommitted ?? false,
        isEssential,
        isSurplusTarget,
        monthlyAmount: cat.type === "REGULAR" ? cat.monthlyAmount : null,
        everydayAllowanceAmount: (cat.type === "EVERYDAY" || cat.type === "PERSONAL") ? (cat as any).allowance : null,
        enteredAmount: cat.type === "REGULAR" ? cat.monthlyAmount : ((cat.type === "EVERYDAY" || cat.type === "PERSONAL") ? (cat as any).allowance : null),
        icon: cat.icon,
        colour: cat.color,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    insertedCatMap[cat.key] = inserted;

    if (cat.type === "GOAL" && cat.target) {
      await db.insert(categorySchedules).values({
        categoryId: inserted.id,
        targetAmount: cat.target,
        targetDate: cat.due || null,
        dueDate: cat.due || null,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    // Duplicate categories for Raehan Household so Raehan Household is fully populated
    const [insertedRaehanCat] = await db
      .insert(categories)
      .values({
        name: cat.name,
        type: cat.type,
        userId: cat.type === "PERSONAL" ? (cat.key === "kaesava_personal" ? userId : raehanUserId) : null,
        isCommitted: cat.isCommitted ?? false,
        isEssential,
        isSurplusTarget,
        monthlyAmount: cat.type === "REGULAR" ? cat.monthlyAmount : null,
        everydayAllowanceAmount: (cat.type === "EVERYDAY" || cat.type === "PERSONAL") ? (cat as any).allowance : null,
        enteredAmount: cat.type === "REGULAR" ? cat.monthlyAmount : ((cat.type === "EVERYDAY" || cat.type === "PERSONAL") ? (cat as any).allowance : null),
        icon: cat.icon,
        colour: cat.color,
        tenantId: raehanTenantId,
        appId,
        createdBy: raehanUserId,
        updatedBy: raehanUserId,
      })
      .returning();

    if (cat.type === "GOAL" && cat.target) {
      await db.insert(categorySchedules).values({
        categoryId: insertedRaehanCat.id,
        targetAmount: cat.target,
        targetDate: cat.due || null,
        dueDate: cat.due || null,
        tenantId: raehanTenantId,
        appId,
        createdBy: raehanUserId,
        updatedBy: raehanUserId,
      });
    }
  }

  // 6. Income Sources
  const [salarySource] = await db
    .insert(incomeSources)
    .values({
      name: "Primary Salary (Fortnightly)",
      amount: "5200.00",
      receivingAccountId: primaryAccount.id,
      rrule: "FREQ=WEEKLY;INTERVAL=2",
      startDate: "2026-07-01",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [freelanceSource] = await db
    .insert(incomeSources)
    .values({
      name: "Freelance & Consulting Work",
      amount: "1500.00",
      receivingAccountId: primaryAccount.id,
      rrule: "FREQ=MONTHLY",
      startDate: "2026-07-05",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  // 7. Income Events (Historical & Upcoming)
  await db.insert(incomeEvents).values([
    {
      incomeSourceId: salarySource.id,
      expectedDate: "2026-07-01",
      expectedAmount: "5200.00",
      actualAmount: "5200.00",
      status: "CONFIRMED",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      incomeSourceId: salarySource.id,
      expectedDate: "2026-07-15",
      expectedAmount: "5200.00",
      actualAmount: "5200.00",
      status: "CONFIRMED",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      incomeSourceId: salarySource.id,
      expectedDate: "2026-07-29",
      expectedAmount: "5200.00",
      status: "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      incomeSourceId: freelanceSource.id,
      expectedDate: "2026-08-05",
      expectedAmount: "1500.00",
      status: "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  // Income Sources for Raehan Household
  const [raehanSalarySource] = await db
    .insert(incomeSources)
    .values({
      name: "Raehan Tech Salary",
      amount: "5800.00",
      receivingAccountId: raehanPrimaryAccount.id,
      rrule: "FREQ=WEEKLY;INTERVAL=2",
      startDate: "2026-07-01",
      tenantId: raehanTenantId,
      appId,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    })
    .returning();

  await db.insert(incomeEvents).values([
    {
      incomeSourceId: raehanSalarySource.id,
      expectedDate: "2026-07-01",
      expectedAmount: "5800.00",
      actualAmount: "5800.00",
      status: "CONFIRMED",
      tenantId: raehanTenantId,
      appId,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
    {
      incomeSourceId: raehanSalarySource.id,
      expectedDate: "2026-07-29",
      expectedAmount: "5800.00",
      status: "UPCOMING",
      tenantId: raehanTenantId,
      appId,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
  ]);

  // 8. Expense Sources & Events
  const [mortgageExpenseSource] = await db
    .insert(expenseSources)
    .values({
      name: "Mortgage Repayment",
      amount: "3200.00",
      categoryId: insertedCatMap.mortgage.id,
      rrule: "FREQ=MONTHLY",
      startDate: "2026-07-01",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [aglExpenseSource] = await db
    .insert(expenseSources)
    .values({
      name: "AGL Energy",
      amount: "340.00",
      categoryId: insertedCatMap.electricity.id,
      rrule: "FREQ=MONTHLY",
      startDate: "2026-07-10",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [broadbandExpenseSource] = await db
    .insert(expenseSources)
    .values({
      name: "Aussie Broadband",
      amount: "89.00",
      categoryId: insertedCatMap.broadband.id,
      rrule: "FREQ=MONTHLY",
      startDate: "2026-07-12",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  await db.insert(expenseEvents).values([
    {
      expenseSourceId: mortgageExpenseSource.id,
      categoryId: insertedCatMap.mortgage.id,
      name: "Mortgage Repayment",
      expectedDate: "2026-07-01",
      expectedAmount: "3200.00",
      actualAmount: "3200.00",
      status: "PAID",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      expenseSourceId: aglExpenseSource.id,
      categoryId: insertedCatMap.electricity.id,
      name: "AGL Energy",
      expectedDate: "2026-07-10",
      expectedAmount: "340.00",
      actualAmount: "340.00",
      status: "PAID",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      expenseSourceId: broadbandExpenseSource.id,
      categoryId: insertedCatMap.broadband.id,
      name: "Aussie Broadband",
      expectedDate: "2026-07-12",
      expectedAmount: "89.00",
      actualAmount: "89.00",
      status: "PAID",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      expenseSourceId: mortgageExpenseSource.id,
      categoryId: insertedCatMap.mortgage.id,
      name: "Mortgage Repayment",
      expectedDate: "2026-08-01",
      expectedAmount: "3200.00",
      status: "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      expenseSourceId: aglExpenseSource.id,
      categoryId: insertedCatMap.electricity.id,
      name: "AGL Energy",
      expectedDate: "2026-08-10",
      expectedAmount: "340.00",
      status: "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  // 9. Transaction Ledger Entries
  await db.insert(transactionLedger).values([
    {
      categoryId: insertedCatMap.groceries.id,
      bankAccountId: primaryAccount.id,
      flowType: "DEBIT",
      amount: "142.50",
      idempotencyKey: "expense-groceries-debit-2026-07-02",
      note: "Woolworths Supermarket",
      source: "MANUAL",
      recordedAt: new Date("2026-07-02T10:30:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      categoryId: insertedCatMap.dining.id,
      bankAccountId: primaryAccount.id,
      flowType: "DEBIT",
      amount: "48.00",
      idempotencyKey: "expense-dining-debit-2026-07-04",
      note: "Local Cafe Brunch",
      source: "MANUAL",
      recordedAt: new Date("2026-07-04T09:15:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      categoryId: insertedCatMap.broadband.id,
      bankAccountId: primaryAccount.id,
      flowType: "DEBIT",
      amount: "89.00",
      idempotencyKey: "expense-broadband-debit-2026-07-12",
      note: "Aussie Broadband Auto-Pay",
      source: "AUTO",
      recordedAt: new Date("2026-07-12T08:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  // 10. File Notes
  await db.insert(fileNotes).values([
    {
      entityType: "categories",
      entityId: insertedCatMap.car.id,
      comment: "Annual Comprehensive Insurance Policy & NRMA Roadside Assistance Renewal Notice",
      fileName: "NRMA_Insurance_Policy_2026.pdf",
      fileMimeType: "application/pdf",
      fileSize: "1.2 MB",
      fileKey: "uploads/categories/nrma-policy.pdf",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      entityType: "categories",
      entityId: insertedCatMap.holiday.id,
      comment: "Flight estimate itinerary breakdown and hotel deposit confirmation for Tokyo & Kyoto",
      fileName: "Japan_Trip_Itinerary_Estimate.pdf",
      fileMimeType: "application/pdf",
      fileSize: "2.4 MB",
      fileKey: "uploads/categories/japan-trip.pdf",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  // 11. Device Tokens
  await db.insert(deviceTokens).values([
    {
      userId,
      platform: "ios",
      token: "ExponentPushToken[sample-ios-device-token-12345]",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      userId,
      platform: "web",
      token: "web-push-token-kaesava-dashboard-browser-67890",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
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
