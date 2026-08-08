import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  tenants,
  tenantUsers,
  bankAccounts,
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

  const tenantId = "d3b07384-d113-4ec4-a5a4-000000000001"; // Fixed tenant ID matching kaesava@gmail.com session
  const appId = "01908bde-34bb-7b19-a178-574211bc93aa";
  let userId = "d3b07384-d113-4ec4-a5a4-000000000001";

  // Check if neon_auth.user already has a user for kaesava@gmail.com
  let existingNeonUsers: any[] = [];
  try {
    const res = await db.execute<{ id: string; email: string }>(
      sql`SELECT id, email FROM neon_auth.user WHERE email = 'kaesava@gmail.com' LIMIT 1`
    );
    existingNeonUsers = Array.isArray(res) ? res : (res as any)?.rows ?? [];
  } catch (e) {
    // If neon_auth schema doesn't exist yet, proceed gracefully
    console.log("Note: neon_auth.user table check skipped or schema not initialized.");
  }

  const existingNeonUser = existingNeonUsers[0];

  if (existingNeonUser) {
    userId = existingNeonUser.id;
    console.log(`Found existing Neon Auth user for kaesava@gmail.com with ID: ${userId}`);
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
      console.log("neon_auth.user insert bypassed (schema managed by Neon Auth).");
    }
  }

  // Ensure DB schema migrations/columns are present
  await db.execute(sql`DROP TABLE IF EXISTS expense_source_schedules CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS income_source_schedules CASCADE`);
  await db.execute(sql`ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS rrule VARCHAR(255), ADD COLUMN IF NOT EXISTS start_date DATE, ADD COLUMN IF NOT EXISTS end_date DATE`);
  await db.execute(sql`ALTER TABLE expense_sources ADD COLUMN IF NOT EXISTS rrule VARCHAR(255), ADD COLUMN IF NOT EXISTS start_date DATE, ADD COLUMN IF NOT EXISTS end_date DATE`);
  await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS everyday_allowance_amount NUMERIC(12,2)`);

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
  await db.delete(bankAccounts);
  await db.delete(tenantUsers);
  await db.delete(tenants);
  await db.delete(users);
  await db.delete(apps);

  console.log("🧹 Cleaned database tables.");

  // 0. App & User Record
  await db.insert(users).values({
    id: userId,
    email: "kaesava@gmail.com",
    displayName: "Kaesava",
  });

  await db.insert(apps).values({
    id: appId,
    name: "Money Matters",
    slug: "money-matters",
  });

  // 1. Tenant
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

  // 2. Tenant Users
  await db.insert(tenantUsers).values({
    tenantId: household.id,
    userId,
    role: "OWNER" as const,
    inviteStatus: "ACCEPTED" as const,
    appId,
    createdBy: userId,
    updatedBy: userId,
  });

  // 3. User Preferences
  await db.insert(userPreferences).values({
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
  });

  // 4. Bank Accounts
  const [everydayAccount] = await db
    .insert(bankAccounts)
    .values({
      name: "ANZ Everyday Smart Account",
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

  const [emergencyVault] = await db
    .insert(bankAccounts)
    .values({
      name: "Emergency Reserve Vault",
      lastKnownBalance: "15000.00",
      unbudgetedBuffer: "0.00",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

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
      bankAccountId: everydayAccount.id,
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
      bankAccountId: everydayAccount.id,
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
      bankAccountId: everydayAccount.id,
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
      bankAccountId: everydayAccount.id,
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
      bankAccountId: everydayAccount.id,
    },
    {
      key: "everyday",
      name: "Everyday Incidental Buffer",
      type: "EVERYDAY" as const,
      isCommitted: false,
      excess: true,
      icon: "wallet",
      color: "#00B4A6",
      bankAccountId: everydayAccount.id,
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
      bankAccountId: everydayAccount.id,
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
      bankAccountId: everydayAccount.id,
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
      bankAccountId: everydayAccount.id,
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
      bankAccountId: everydayAccount.id,
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
      bankAccountId: everydayAccount.id,
    },

    // GOAL (Target Savings Pools)
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
      bankAccountId: emergencyVault.id,
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
      bankAccountId: savingsAccount.id,
    },
    {
      key: "holiday",
      name: "Annual Family Holiday (Japan 2026)",
      type: "GOAL" as const,
      isCommitted: false,
      excess: false,
      isSavingsDefault: true,
      icon: "plane",
      color: "#00B4A6",
      target: "8500.00",
      due: "2026-11-30",
      bankAccountId: savingsAccount.id,
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
      bankAccountId: savingsAccount.id,
    },
  ];

  const insertedCatMap: Record<string, any> = {};

  for (const cat of canonicalCategories) {
    const [inserted] = await db
      .insert(categories)
      .values({
        name: cat.name,
        type: cat.type,
        isCommitted: cat.isCommitted,
        monthlyAmount: cat.type === "REGULAR" ? cat.monthlyAmount : null,
        everydayAllowanceAmount: cat.type === "EVERYDAY" ? cat.allowance : null,
        isDefaultExcess: cat.excess,
        isDefaultSavings: (cat as any).isSavingsDefault || false,
        icon: cat.icon,
        colour: cat.color,
        bankAccountId: cat.bankAccountId || null,
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

  // 6. Income Sources
  const [salarySource] = await db
    .insert(incomeSources)
    .values({
      name: "Primary Salary (Fortnightly)",
      amount: "5200.00",
      receivingAccountId: everydayAccount.id,
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
      receivingAccountId: everydayAccount.id,
      rrule: "FREQ=MONTHLY",
      startDate: "2026-07-05",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  // 7. Income Events (Historical & Upcoming)
  const [pastIncomeEvent1] = await db
    .insert(incomeEvents)
    .values({
      incomeSourceId: salarySource.id,
      expectedDate: "2026-07-01",
      expectedAmount: "5200.00",
      actualAmount: "5200.00",
      status: "CONFIRMED",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [pastIncomeEvent2] = await db
    .insert(incomeEvents)
    .values({
      incomeSourceId: salarySource.id,
      expectedDate: "2026-07-15",
      expectedAmount: "5200.00",
      actualAmount: "5200.00",
      status: "CONFIRMED",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [upcomingIncomeEvent] = await db
    .insert(incomeEvents)
    .values({
      incomeSourceId: salarySource.id,
      expectedDate: "2026-07-29",
      expectedAmount: "5200.00",
      status: "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  await db.insert(incomeEvents).values({
    incomeSourceId: freelanceSource.id,
    expectedDate: "2026-08-05",
    expectedAmount: "1500.00",
    status: "UPCOMING",
    tenantId,
    appId,
    createdBy: userId,
    updatedBy: userId,
  });

  // 8. Expense Sources & Events
  const [mortgageExpenseSource] = await db
    .insert(expenseSources)
    .values({
      name: "Home Loan Mortgage Repayment",
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

  const [electricityExpenseSource] = await db
    .insert(expenseSources)
    .values({
      name: "Quarterly Electricity & Gas Bill",
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
      name: "Aussie Broadband NBN 100/20",
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

  // Paid Expense Events
  await db.insert(expenseEvents).values([
    {
      expenseSourceId: mortgageExpenseSource.id,
      categoryId: insertedCatMap.mortgage.id,
      name: "Home Loan Mortgage Repayment",
      expectedDate: "2026-07-01",
      expectedAmount: "3200.00",
      actualAmount: "3200.00",
      status: "PAID",
      paymentMethod: "DIRECT_DEBIT",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      expenseSourceId: electricityExpenseSource.id,
      categoryId: insertedCatMap.electricity.id,
      name: "Quarterly Electricity & Gas Bill",
      expectedDate: "2026-07-10",
      expectedAmount: "340.00",
      actualAmount: "340.00",
      status: "PAID",
      paymentMethod: "BPAY",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      expenseSourceId: broadbandExpenseSource.id,
      categoryId: insertedCatMap.broadband.id,
      name: "Aussie Broadband NBN 100/20",
      expectedDate: "2026-07-12",
      expectedAmount: "89.00",
      actualAmount: "89.00",
      status: "PAID",
      paymentMethod: "CREDIT_CARD",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  // Upcoming Expense Events
  await db.insert(expenseEvents).values([
    {
      expenseSourceId: null,
      categoryId: insertedCatMap.health.id,
      name: "Bupa Health Insurance Premium",
      expectedDate: "2026-07-28",
      expectedAmount: "280.00",
      status: "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      expenseSourceId: null,
      categoryId: insertedCatMap.subscriptions.id,
      name: "Netflix & Spotify Subscriptions",
      expectedDate: "2026-07-30",
      expectedAmount: "65.00",
      status: "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      expenseSourceId: mortgageExpenseSource.id,
      categoryId: insertedCatMap.mortgage.id,
      name: "Home Loan Mortgage Repayment",
      expectedDate: "2026-08-01",
      expectedAmount: "3200.00",
      status: "UPCOMING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  // 9. Allocation Plans & Lines
  const [allocationPlan] = await db
    .insert(allocationPlans)
    .values({
      incomeEventId: pastIncomeEvent2.id,
      status: "CONFIRMED",
      totalIncomeAmount: "5200.00",
      confirmedAt: new Date("2026-07-15T09:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [planLineMortgage] = await db
    .insert(allocationPlanLines)
    .values({
      planId: allocationPlan.id,
      categoryId: insertedCatMap.mortgage.id,
      proposedAmount: "1600.00",
      confirmedAmount: "1600.00",
      reasoning: "Fortnightly mortgage contribution split",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [planLineHoliday] = await db
    .insert(allocationPlanLines)
    .values({
      planId: allocationPlan.id,
      categoryId: insertedCatMap.holiday.id,
      proposedAmount: "500.00",
      confirmedAmount: "500.00",
      reasoning: "Target savings allocation for Japan 2026 trip",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [planLineEveryday] = await db
    .insert(allocationPlanLines)
    .values({
      planId: allocationPlan.id,
      categoryId: insertedCatMap.everyday.id,
      proposedAmount: "800.00",
      confirmedAmount: "800.00",
      reasoning: "Everyday discretionary spending allowance",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  // 10. Transaction Ledger History (DEBITs & CREDITs)
  await db.insert(transactionLedger).values([
    // Payday Credits
    {
      categoryId: insertedCatMap.mortgage.id,
      bankAccountId: everydayAccount.id,
      planLineId: planLineMortgage.id,
      flowType: "CREDIT",
      amount: "1600.00",
      idempotencyKey: "payday-credit-mortgage-2026-07-15",
      note: "Payday Allocation Deposit - Mortgage",
      source: "AUTO",
      recordedAt: new Date("2026-07-15T09:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      categoryId: insertedCatMap.holiday.id,
      bankAccountId: savingsAccount.id,
      planLineId: planLineHoliday.id,
      flowType: "CREDIT",
      amount: "500.00",
      idempotencyKey: "payday-credit-holiday-2026-07-15",
      note: "Payday Allocation Deposit - Holiday Goal",
      source: "AUTO",
      recordedAt: new Date("2026-07-15T09:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      categoryId: insertedCatMap.everyday.id,
      bankAccountId: everydayAccount.id,
      planLineId: planLineEveryday.id,
      flowType: "CREDIT",
      amount: "800.00",
      idempotencyKey: "payday-credit-everyday-2026-07-15",
      note: "Payday Allocation Deposit - Everyday Allowance",
      source: "AUTO",
      recordedAt: new Date("2026-07-15T09:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    // Ad-hoc Income Credit (Side Hustle)
    {
      categoryId: insertedCatMap.everyday.id,
      bankAccountId: everydayAccount.id,
      flowType: "CREDIT",
      amount: "350.00",
      idempotencyKey: "income-freelance-credit-2026-07-18",
      note: "Quick Income - Freelance Web Design Milestone",
      source: "MANUAL",
      recordedAt: new Date("2026-07-18T14:30:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    // Expense Debits
    {
      categoryId: insertedCatMap.mortgage.id,
      bankAccountId: everydayAccount.id,
      flowType: "DEBIT",
      amount: "1600.00",
      idempotencyKey: "expense-mortgage-debit-2026-07-16",
      note: "ANZ Direct Debit - Home Loan Repayment",
      source: "MANUAL",
      recordedAt: new Date("2026-07-16T10:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      categoryId: insertedCatMap.groceries.id,
      bankAccountId: everydayAccount.id,
      flowType: "DEBIT",
      amount: "245.50",
      idempotencyKey: "expense-groceries-debit-2026-07-17",
      note: "Woolworths Supermarket - Weekly Groceries",
      source: "MANUAL",
      recordedAt: new Date("2026-07-17T16:20:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      categoryId: insertedCatMap.everyday.id,
      bankAccountId: everydayAccount.id,
      flowType: "DEBIT",
      amount: "48.20",
      idempotencyKey: "expense-coffee-debit-2026-07-20",
      note: "Quick Expense - Local Cafe & Bakery Lunch",
      source: "MANUAL",
      recordedAt: new Date("2026-07-20T12:15:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      categoryId: insertedCatMap.broadband.id,
      bankAccountId: everydayAccount.id,
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

  // 11. File Notes
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

  // 12. Device Tokens
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
