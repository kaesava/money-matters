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
  tenantUserPreferences,
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

  const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || (isProd ? "https://ep-spring-snow-a70f61xz.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth" : "https://ep-icy-resonance-a7s94hg4.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth");
  const originUrl = isProd ? "https://moneymatters.kaesava.au" : "http://localhost:3000";

  // Helper to ensure Neon Auth user is seeded with pre-verified status (no HTTP REST signup calls that trigger emails)
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
        await db.execute(sql`
          UPDATE neon_auth.user 
          SET "emailVerified" = true, name = COALESCE(${name}, name), role = COALESCE(role, 'user'), "updatedAt" = now()
          WHERE id = ${resolvedId}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
          VALUES (${resolvedId}, ${name}, ${email}, true, 'user', now(), now())
        `);
      }
      console.log(`Pre-verified ${email} (emailVerified = true) in neon_auth.user.`);
    } catch (e) {
      console.log(`neon_auth.user update/insert for ${email} skipped:`, e);
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

  // Ensure DB schema migrations/columns are present
  await db.execute(sql`DROP TABLE IF EXISTS expense_source_schedules CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS income_source_schedules CASCADE`);
  await db.execute(sql`ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS rrule VARCHAR(255), ADD COLUMN IF NOT EXISTS start_date DATE, ADD COLUMN IF NOT EXISTS end_date DATE`);
  await db.execute(sql`ALTER TABLE expense_sources ADD COLUMN IF NOT EXISTS rrule VARCHAR(255), ADD COLUMN IF NOT EXISTS start_date DATE, ADD COLUMN IF NOT EXISTS end_date DATE`);
  await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS everyday_allowance_amount NUMERIC(12,2), ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL`);
  await db.execute(sql`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL, ADD COLUMN IF NOT EXISTS user_id UUID`);
  await db.execute(sql`ALTER TABLE tenant_user_preferences DROP COLUMN IF EXISTS payday_alerts_enabled, DROP COLUMN IF EXISTS shortfall_alerts_enabled, DROP COLUMN IF EXISTS bill_reminders_enabled, DROP COLUMN IF EXISTS weekly_digest_enabled`);

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
    // Optional public auth session tables
  }

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
  await db.delete(tenantUserPreferences);
  await db.delete(bankAccountCategoryMappings);
  await db.delete(bankAccounts);
  await db.delete(tenantUsers);
  await db.delete(tenants);
  await db.delete(users);
  await db.delete(apps);

  console.log("🧹 Cleaned database tables across neon_auth and public schemas (clean slate).");

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
      country: "AU",
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

  // 2. Tenant Users (Multi-tenant memberships)
  await db.insert(tenantUsers).values([
    // Kaesava Household: kaesava (OWNER), raehan (MEMBER invited by kaesava)
    {
      tenantId: household.id,
      userId,
      role: "OWNER" as const,
      inviteStatus: "ACCEPTED" as const,
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
      createdBy: userId,
      updatedBy: userId,
    },
    // Raehan Household: raehan (OWNER), kaesava (MEMBER invited by raehan)
    {
      tenantId: raehanHousehold.id,
      userId: raehanUserId,
      role: "OWNER" as const,
      inviteStatus: "ACCEPTED" as const,
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
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
    // Play Store Tester Household: tester (OWNER)
    {
      tenantId: testerHousehold.id,
      userId: testerUserId,
      role: "OWNER" as const,
      inviteStatus: "ACCEPTED" as const,
      createdBy: testerUserId,
      updatedBy: testerUserId,
    },
  ]);

  // 3. User Preferences (Global User Preferences + Tenant-Scoped User Preferences)
  await db.insert(userPreferences).values([
    {
      userId,
      timezone: "Australia/Sydney",
      locale: "en-AU",
      theme: "system",
      showIcons: true,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      userId: raehanUserId,
      timezone: "Australia/Sydney",
      locale: "en-AU",
      theme: "system",
      showIcons: true,
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
    {
      userId: testerUserId,
      timezone: "Australia/Sydney",
      locale: "en-AU",
      theme: "system",
      showIcons: true,
      createdBy: testerUserId,
      updatedBy: testerUserId,
    },
  ]);

  await db.insert(tenantUserPreferences).values([
    {
      userId,
      tenantId,
      appId,
      appPreferences: {
        [appId]: {
          payday_alerts_enabled: true,
          shortfall_alerts_enabled: true,
          bill_reminders_enabled: true,
          weekly_digest_enabled: true,
          quick_actions_collapsed: false,
          show_icons: true,
          filters_expanded: false,
          skip_pool_adjustment_confirmation: false,
          setup_completed: true,
          setup_completed_at: now.toISOString(),
        },
      },
      createdBy: userId,
      updatedBy: userId,
    },
    {
      userId: raehanUserId,
      tenantId: raehanTenantId,
      appId,
      appPreferences: {
        [appId]: {
          payday_alerts_enabled: true,
          shortfall_alerts_enabled: true,
          bill_reminders_enabled: true,
          weekly_digest_enabled: true,
          quick_actions_collapsed: false,
          show_icons: true,
          filters_expanded: false,
          skip_pool_adjustment_confirmation: false,
          setup_completed: true,
          setup_completed_at: now.toISOString(),
        },
      },
      createdBy: raehanUserId,
      updatedBy: raehanUserId,
    },
    {
      userId: testerUserId,
      tenantId: testerTenantId,
      appId,
      appPreferences: {
        [appId]: {
          payday_alerts_enabled: true,
          shortfall_alerts_enabled: true,
          bill_reminders_enabled: true,
          weekly_digest_enabled: true,
          quick_actions_collapsed: false,
          show_icons: true,
          filters_expanded: false,
          skip_pool_adjustment_confirmation: false,
          setup_completed: true,
          setup_completed_at: now.toISOString(),
        },
      },
      createdBy: testerUserId,
      updatedBy: testerUserId,
    },
  ]);

  // 4. Bank Accounts
  const [primaryAccount] = await db
    .insert(bankAccounts)
    .values({
      name: "Primary Account",
      bankProvider: "CBA",
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
      bankProvider: "ING",
      lastKnownBalance: "48500.00",
      unbudgetedBuffer: "0.00",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
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
      categoryType: "GOAL" as const,
      bankAccountId: primaryAccount.id,
      createdBy: userId,
      updatedBy: userId,
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

    // PRIVATE EVERYDAY POOLS (Stealth Privacy Personal Funds)
    {
      key: "kaesava_personal",
      name: "Kaesava Private Pool",
      type: "EVERYDAY" as const,
      isPrivate: true,
      isCommitted: false,
      excess: false,
      icon: "user",
      color: "#3B82F6",
      allowance: "300.00",
    },
    {
      key: "raehan_personal",
      name: "Raehan Private Pool",
      type: "EVERYDAY" as const,
      isPrivate: true,
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
        isPrivate: Boolean((cat as any).isPrivate),
        userId: (cat as any).isPrivate ? (cat.key === "kaesava_personal" ? userId : raehanUserId) : null,
        isCommitted: cat.isCommitted ?? false,
        isEssential,
        isSurplusTarget,
        monthlyAmount: cat.type === "REGULAR" ? cat.monthlyAmount : null,
        everydayAllowanceAmount: cat.type === "EVERYDAY" ? (cat as any).allowance : null,
        enteredAmount: cat.type === "REGULAR" ? cat.monthlyAmount : (cat.type === "EVERYDAY" ? (cat as any).allowance : null),
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

  }

  // Helper to burst dates from RRULE
  function burstDates(rruleStr: string, startDateStr: string, monthsAhead = 12): string[] {
    const dates: string[] = [];
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return dates;
    const now = new Date();
    const cutOff = new Date(now.getFullYear(), now.getMonth() + monthsAhead, now.getDate());

    let current = new Date(start.getTime());
    const isWeekly = rruleStr.includes("FREQ=WEEKLY");
    const isFortnightly = isWeekly && rruleStr.includes("INTERVAL=2");
    const isMonthly = rruleStr.includes("FREQ=MONTHLY");
    const isYearly = rruleStr.includes("FREQ=YEARLY");

    let stepDays = 7;
    if (isFortnightly) stepDays = 14;

    let iterations = 0;
    while (iterations < 100) {
      iterations++;
      if (current > cutOff) break;
      dates.push(current.toISOString().split("T")[0]);

      if (isMonthly) {
        const targetYear = current.getFullYear() + Math.floor((current.getMonth() + 1) / 12);
        const targetMonth = (current.getMonth() + 1) % 12;
        const originalDay = start.getDate();
        const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        current = new Date(targetYear, targetMonth, Math.min(originalDay, daysInTargetMonth));
      } else if (isYearly) {
        const targetYear = current.getFullYear() + 1;
        const originalMonth = start.getMonth();
        const originalDay = start.getDate();
        const daysInTargetMonth = new Date(targetYear, originalMonth + 1, 0).getDate();
        current = new Date(targetYear, originalMonth, Math.min(originalDay, daysInTargetMonth));
      } else {
        current = new Date(current.getTime() + stepDays * 24 * 60 * 60 * 1000);
      }
    }

    return dates;
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

  // 7. Income Events (Bursted across 12 months)
  const salaryDates = burstDates("FREQ=WEEKLY;INTERVAL=2", "2026-07-01", 12);
  const freelanceDates = burstDates("FREQ=MONTHLY", "2026-07-05", 12);
  const todayStr = new Date().toISOString().split("T")[0];

  const incomeEventsToInsert = [
    ...salaryDates.map((dateStr) => ({
      incomeSourceId: salarySource.id,
      expectedDate: dateStr,
      expectedAmount: "5200.00",
      actualAmount: dateStr < todayStr ? "5200.00" : null,
      status: (dateStr < todayStr ? "CONFIRMED" : "UPCOMING") as "CONFIRMED" | "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })),
    ...freelanceDates.map((dateStr) => ({
      incomeSourceId: freelanceSource.id,
      expectedDate: dateStr,
      expectedAmount: "1500.00",
      actualAmount: dateStr < todayStr ? "1500.00" : null,
      status: (dateStr < todayStr ? "CONFIRMED" : "UPCOMING") as "CONFIRMED" | "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })),
  ];

  const insertedIncomeEvents = await db.insert(incomeEvents).values(incomeEventsToInsert).returning();
  const firstIncomeEvent = insertedIncomeEvents[0];

  // 9. Payday Allocation Plan & Credit Ledger Entries
  const [allocationPlan] = await db
    .insert(allocationPlans)
    .values({
      incomeEventId: firstIncomeEvent.id,
      totalIncomeAmount: "5200.00",
      status: "CONFIRMED",
      confirmedAt: new Date("2026-07-01T09:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  await db.insert(allocationPlanLines).values([
    { planId: allocationPlan.id, categoryId: insertedCatMap.mortgage.id, proposedAmount: "1600.00", confirmedAmount: "1600.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.electricity.id, proposedAmount: "170.00", confirmedAmount: "170.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.broadband.id, proposedAmount: "44.50", confirmedAmount: "44.50", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.groceries.id, proposedAmount: "585.00", confirmedAmount: "585.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.dining.id, proposedAmount: "520.00", confirmedAmount: "520.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.petrol.id, proposedAmount: "130.00", confirmedAmount: "130.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.transport.id, proposedAmount: "90.00", confirmedAmount: "90.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.personal.id, proposedAmount: "215.00", confirmedAmount: "215.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.everyday.id, proposedAmount: "150.00", confirmedAmount: "150.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.kaesava_personal.id, proposedAmount: "150.00", confirmedAmount: "150.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.raehan_personal.id, proposedAmount: "150.00", confirmedAmount: "150.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.emergency.id, proposedAmount: "500.00", confirmedAmount: "500.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.holiday.id, proposedAmount: "400.00", confirmedAmount: "400.00", tenantId, appId, createdBy: userId, updatedBy: userId },
    { planId: allocationPlan.id, categoryId: insertedCatMap.surplus_reserve.id, proposedAmount: "495.50", confirmedAmount: "495.50", tenantId, appId, createdBy: userId, updatedBy: userId },
  ]);

  // 10. Transaction Ledger Entries (Initial Pool Allocations & Spend Debits)
  await db.insert(transactionLedger).values([
    // Payday Credit Allocations
    { categoryId: insertedCatMap.groceries.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "585.00", idempotencyKey: "payday-alloc-groceries-2026-07-01", note: "Payday Allocation — Groceries", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.dining.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "520.00", idempotencyKey: "payday-alloc-dining-2026-07-01", note: "Payday Allocation — Dining", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.petrol.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "130.00", idempotencyKey: "payday-alloc-petrol-2026-07-01", note: "Payday Allocation — Petrol", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.transport.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "90.00", idempotencyKey: "payday-alloc-transport-2026-07-01", note: "Payday Allocation — Transport", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.personal.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "215.00", idempotencyKey: "payday-alloc-personal-2026-07-01", note: "Payday Allocation — Personal Care", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.everyday.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "150.00", idempotencyKey: "payday-alloc-everyday-2026-07-01", note: "Payday Allocation — Everyday Buffer", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },

    { categoryId: insertedCatMap.mortgage.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "1600.00", idempotencyKey: "payday-alloc-mortgage-2026-07-01", note: "Payday Allocation — Mortgage Repayment", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.electricity.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "170.00", idempotencyKey: "payday-alloc-electricity-2026-07-01", note: "Payday Allocation — Electricity", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.broadband.id, bankAccountId: primaryAccount.id, flowType: "CREDIT", amount: "44.50", idempotencyKey: "payday-alloc-broadband-2026-07-01", note: "Payday Allocation — Broadband", source: "AUTO", recordedAt: new Date("2026-07-01T09:05:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },

    // Initial Goal Savings Account Balances
    { categoryId: insertedCatMap.emergency.id, bankAccountId: savingsAccount.id, flowType: "CREDIT", amount: "10000.00", idempotencyKey: "initial-goal-emergency-2026-07-01", note: "Initial Goal Balance — Emergency Reserve", source: "MANUAL", recordedAt: new Date("2026-07-01T09:00:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.holiday.id, bankAccountId: savingsAccount.id, flowType: "CREDIT", amount: "5000.00", idempotencyKey: "initial-goal-holiday-2026-07-01", note: "Initial Goal Balance — Japan Trip", source: "MANUAL", recordedAt: new Date("2026-07-01T09:00:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },

    // Everyday Spend Debits
    { categoryId: insertedCatMap.groceries.id, bankAccountId: primaryAccount.id, flowType: "DEBIT", amount: "142.50", idempotencyKey: "expense-groceries-debit-2026-07-02", note: "Woolworths Supermarket", source: "MANUAL", recordedAt: new Date("2026-07-02T10:30:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.dining.id, bankAccountId: primaryAccount.id, flowType: "DEBIT", amount: "48.00", idempotencyKey: "expense-dining-debit-2026-07-04", note: "Local Cafe Brunch", source: "MANUAL", recordedAt: new Date("2026-07-04T09:15:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
    { categoryId: insertedCatMap.broadband.id, bankAccountId: primaryAccount.id, flowType: "DEBIT", amount: "89.00", idempotencyKey: "expense-broadband-debit-2026-07-12", note: "Aussie Broadband Auto-Pay", source: "AUTO", recordedAt: new Date("2026-07-12T08:00:00Z"), tenantId, appId, createdBy: userId, updatedBy: userId },
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
