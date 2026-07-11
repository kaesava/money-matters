import { createDbClient } from "@money-matters/core";
import { households, householdMembers, bankAccounts, categories, categorySchedules, incomeSources, incomeSourceSchedules, incomeEvents } from "@money-matters/db";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env.development" });

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log("🌱 Seeding database...");
  const db = createDbClient(connectionString);

  const tenantId = "d3b07384-d113-4ec4-a5a4-000000000001"; // Fixed tenant ID matching kaesava@gmail.com session
  const appId = "01908bde-34bb-7b19-a178-574211bc93aa";
  const userId = "d3b07384-d113-4ec4-a5a4-000000000001";

  // Clean existing tables first to ensure idempotent fresh state
  await db.delete(incomeEvents);
  await db.delete(incomeSourceSchedules);
  await db.delete(incomeSources);
  await db.delete(categorySchedules);
  await db.delete(categories);
  await db.delete(bankAccounts);
  await db.delete(householdMembers);
  await db.delete(households);

  console.log("🧹 Cleaned database tables.");

  // 1. Households
  const [household] = await db
    .insert(households)
    .values({
      id: tenantId,
      name: "Kaesava's Household",
      fyEndMonthDay: "06-30",
      premiumEnabled: true,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  // 2. Household Members
  await db
    .insert(householdMembers)
    .values({
      householdId: household.id,
      userId,
      role: "OWNER" as const,
      inviteStatus: "ACCEPTED" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    });

  // 3. Bank Accounts
  const [everydayAccount] = await db
    .insert(bankAccounts)
    .values({
      householdId: household.id,
      name: "ANZ Everyday Smart",
      purpose: ["EVERYDAY", "INCOME_LANDING"],
      lastKnownBalance: "1500.00",
      isOffset: false,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [savingsAccount] = await db
    .insert(bankAccounts)
    .values({
      householdId: household.id,
      name: "Offset Saver Mortgage Link",
      purpose: ["SAVINGS"],
      lastKnownBalance: "45000.00",
      isOffset: true,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  // 4. Categories
  // Pre-populate canonical categories for target audience (Australian families/professionals)
  const canonicalCategories = [
    // EVERYDAY (Discretionary - Swept residual)
    { name: "Groceries", type: "EVERYDAY" as const, priorityRank: null, excess: false, icon: "local_grocery_store", color: "#6B7280" },
    { name: "Petrol / Transit", type: "EVERYDAY" as const, priorityRank: null, excess: false, icon: "directions_car", color: "#6B7280" },
    { name: "Eating Out & Cafes", type: "EVERYDAY" as const, priorityRank: null, excess: false, icon: "restaurant", color: "#6B7280" },

    // RECURRING (Bills)
    { name: "Rent / Mortgage Payment", type: "RECURRING" as const, priorityRank: 1, excess: false, icon: "home", color: "#EF4444", target: "3200.00", rrule: "FREQ=MONTHLY;BYMONTHDAY=1" },
    { name: "Electricity & Gas", type: "RECURRING" as const, priorityRank: 2, excess: false, icon: "bolt", color: "#F59E0B", target: "380.00", rrule: "FREQ=MONTHLY;BYMONTHDAY=15" },
    { name: "NBN Broadband", type: "RECURRING" as const, priorityRank: 3, excess: false, icon: "wifi", color: "#22C55E", target: "89.00", rrule: "FREQ=MONTHLY;BYMONTHDAY=10" },
    { name: "Private Health Cover", type: "RECURRING" as const, priorityRank: 1, excess: false, icon: "health_and_safety", color: "#EF4444", target: "240.00", rrule: "FREQ=MONTHLY;BYMONTHDAY=28" },

    // MAJOR (Sinking target savings)
    { name: "Emergency Fund", type: "MAJOR" as const, priorityRank: 1, excess: true, icon: "emergency", color: "#EF4444", target: "10000.00", due: "2026-12-31" },
    { name: "Car Registration & Servicing", type: "MAJOR" as const, priorityRank: 2, excess: false, icon: "build", color: "#F59E0B", target: "1200.00", due: "2027-02-15" },
    { name: "Annual Holiday", type: "MAJOR" as const, priorityRank: 3, excess: false, icon: "flight", color: "#22C55E", target: "8000.00", due: "2026-12-20" }
  ];

  for (const cat of canonicalCategories) {
    const [insertedCategory] = await db
      .insert(categories)
      .values({
        householdId: household.id,
        name: cat.name,
        type: cat.type,
        priorityRank: cat.priorityRank,
        isDefaultExcess: cat.excess,
        icon: cat.icon,
        colour: cat.color,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    if (cat.type !== "EVERYDAY" && (cat.target)) {
      await db
        .insert(categorySchedules)
        .values({
          categoryId: insertedCategory.id,
          targetAmount: cat.target,
          rrule: cat.rrule || null,
          dueDate: cat.due || null,
          nextDueDate: cat.due || null,
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        });
    }
  }

  // 5. Income Sources & Schedules
  const [salarySource] = await db
    .insert(incomeSources)
    .values({
      householdId: household.id,
      name: "Fortnightly Salary (Primary)",
      type: "SALARY" as const,
      amount: "4800.00",
      receivingAccountId: everydayAccount.id,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  await db
    .insert(incomeSourceSchedules)
    .values({
      incomeSourceId: salarySource.id,
      rrule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=WE",
      startDate: "2026-07-01",
      nextOccurrenceDate: "2026-07-15",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    });

  // 6. Pre-populate initial upcoming paydays
  await db
    .insert(incomeEvents)
    .values({
      incomeSourceId: salarySource.id,
      expectedDate: "2026-07-15",
      expectedAmount: "4800.00",
      status: "UPCOMING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    });

  console.log("🎉 Seed data successfully created!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
