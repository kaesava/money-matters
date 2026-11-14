import {
  bankAccounts,
  envelopes,
  incomeSources,
  incomeEvents,
  expenseEvents,
  transactionLedger,
  allocationStrategies,
  allocationStrategySteps,
} from "@money-matters/db";
import { CANONICAL_ALLOCATION_PRESETS } from "@money-matters/types";

export async function seedTesterHousehold(
  db: any,
  params: {
    tenantId: string;
    appId: string;
    userId: string;
    now: Date;
  }
) {
  const { tenantId, appId, userId, now } = params;
  const todayStr = now.toISOString().slice(0, 10);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nextMonth = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [everydayAcc, savingsAcc] = await db
    .insert(bankAccounts)
    .values([
      {
        name: "Everyday Spend",
        bankProvider: "CBA",
        accountType: "EVERYDAY" as const,
        lastKnownBalance: "1850.00",
        unbudgetedBuffer: "0.00",
        lastBalanceMatchedAt: now,
        isPrivate: false,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        name: "Bills & Goals Saver",
        bankProvider: "ING",
        accountType: "SAVINGS" as const,
        lastKnownBalance: "6400.00",
        unbudgetedBuffer: "0.00",
        lastBalanceMatchedAt: now,
        isPrivate: false,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
    ])
    .returning();

  const [everydayEnv, rentEnv, emergencyEnv, surplusEnv] = await db
    .insert(envelopes)
    .values([
      {
        name: "Everyday Living",
        envelopeType: "EVERYDAY" as const,
        fundingMode: "TARGET_BALANCE" as const,
        bankAccountId: everydayAcc.id,
        safetyBufferFloor: "200.00",
        monthlyAmount: "1600.00",
        budgetFrequency: "FORTNIGHTLY",
        isPriority: false,
        isSurplusTarget: false,
        isPrivate: false,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        name: "Rent & Utilities",
        envelopeType: "BILL" as const,
        fundingMode: "RECURRING" as const,
        bankAccountId: savingsAcc.id,
        enteredAmount: "2200.00",
        monthlyAmount: "2200.00",
        targetAmount: "2200.00",
        budgetFrequency: "MONTHLY",
        startDate: nextWeek,
        rrule: "FREQ=MONTHLY",
        isPriority: true,
        isSurplusTarget: false,
        isPrivate: false,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        name: "Emergency Fund",
        envelopeType: "GOAL" as const,
        fundingMode: "TARGET_BALANCE" as const,
        bankAccountId: savingsAcc.id,
        targetAmount: "10000.00",
        isPriority: true,
        isSurplusTarget: false,
        isPrivate: false,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        name: "Surplus Reserve",
        envelopeType: "GOAL" as const,
        fundingMode: "RECURRING" as const,
        bankAccountId: savingsAcc.id,
        enteredAmount: "400.00",
        monthlyAmount: "400.00",
        targetAmount: "5000.00",
        budgetFrequency: "MONTHLY",
        rrule: "FREQ=MONTHLY",
        isPriority: false,
        isSurplusTarget: true,
        isPrivate: false,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
    ])
    .returning();

  const [salarySource] = await db
    .insert(incomeSources)
    .values({
      name: "Primary Salary (Fortnightly)",
      amount: "3400.00",
      incomeType: "SALARIED" as const,
      contributionMode: "FULL" as const,
      receivingAccountId: everydayAcc.id,
      rrule: "FREQ=WEEKLY;INTERVAL=2",
      startDate: todayStr,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  await db.insert(incomeEvents).values([
    {
      incomeSourceId: salarySource.id,
      name: "Primary Salary",
      expectedDate: nextWeek,
      expectedAmount: "3400.00",
      status: "PENDING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      incomeSourceId: salarySource.id,
      name: "Primary Salary",
      expectedDate: nextMonth,
      expectedAmount: "3400.00",
      status: "PENDING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  await db.insert(expenseEvents).values({
    envelopeId: rentEnv.id,
    name: "Monthly Rent",
    expectedDate: nextWeek,
    expectedAmount: "2200.00",
    isScheduled: true,
    status: "PENDING" as const,
    tenantId,
    appId,
    createdBy: userId,
    updatedBy: userId,
  });

  await db.insert(transactionLedger).values([
    {
      envelopeId: everydayEnv.id,
      bankAccountId: everydayAcc.id,
      flowType: "CREDIT" as const,
      transactionType: "OPENING_BALANCE" as const,
      amount: "1850.00",
      idempotencyKey: `tester-opening-everyday-${todayStr}`,
      note: "Opening balance",
      source: "MANUAL" as const,
      recordedAt: now,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      envelopeId: emergencyEnv.id,
      bankAccountId: savingsAcc.id,
      flowType: "CREDIT" as const,
      transactionType: "OPENING_BALANCE" as const,
      amount: "4200.00",
      idempotencyKey: `tester-opening-emergency-${todayStr}`,
      note: "Opening emergency savings",
      source: "MANUAL" as const,
      recordedAt: now,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      envelopeId: rentEnv.id,
      bankAccountId: savingsAcc.id,
      flowType: "CREDIT" as const,
      transactionType: "OPENING_BALANCE" as const,
      amount: "2200.00",
      idempotencyKey: `tester-opening-rent-${todayStr}`,
      note: "Opening rent reserve",
      source: "MANUAL" as const,
      recordedAt: now,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  const [strategy] = await db
    .insert(allocationStrategies)
    .values({
      tenantId,
      appId,
      name: "Standard Balanced",
      presetKey: "BALANCED",
      isDefault: true,
      isPrivate: false,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  await db.insert(allocationStrategySteps).values(
    CANONICAL_ALLOCATION_PRESETS.BALANCED.steps.map((step, idx) => ({
      tenantId,
      appId,
      strategyId: strategy.id,
      orderIndex: idx,
      stepType: step.stepType,
      targetEnvelopeId: step.stepType === "SURPLUS_SWEEP" ? surplusEnv.id : null,
      createdBy: userId,
      updatedBy: userId,
    }))
  );
}
