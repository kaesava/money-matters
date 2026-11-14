import {
  bankAccounts,
  envelopes,
  incomeSources,
  incomeEvents,
  allocationPlans,
  allocationPlanLines,
  transactionLedger,
  expenseEvents,
  transferEvents,
} from "@money-matters/db";
import { seedHouseholdEvents } from "./household-events.js";
import { seedStrategiesDraftsAndNotes } from "./household-strategies-and-notes.js";
import {

  getSeedEnvelopeDefinitions,
  SEED_PAYDAYS,
  SEED_PAST_SPLITS_DATA,
  SEED_OPENING_BALANCES,
  SEED_HISTORICAL_DEBITS,
} from "./seed-data.js";

export async function seedSampleHousehold(
  db: any,
  params: {
    tenantId: string;
    appId: string;
    userId: string;
    snehaUserId: string;
    now: Date;
  }
) {
  const { tenantId, appId, userId, snehaUserId, now } = params;

  // 1. Bank Accounts (Shared Joint Accounts & Private Accounts)
  const [everydayAccount] = await db
    .insert(bankAccounts)
    .values({ name: "Everyday Account", bankProvider: "CBA", accountType: "EVERYDAY", lastKnownBalance: "2641.54", unbudgetedBuffer: "0.00", lastBalanceMatchedAt: now, isPrivate: false, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [misaAccount] = await db
    .insert(bankAccounts)
    .values({ name: "MISA (Offset) Account", bankProvider: "CBA", accountType: "LOAN_OFFSET", lastKnownBalance: "167581.35", unbudgetedBuffer: "0.00", lastBalanceMatchedAt: now, isPrivate: false, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [personalSaverAccount] = await db
    .insert(bankAccounts)
    .values({ name: "Kaesava Personal Saver", bankProvider: "Macquarie", accountType: "SAVINGS", lastKnownBalance: "500.00", unbudgetedBuffer: "0.00", lastBalanceMatchedAt: now, isPrivate: true, userId, tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  // 2. Envelopes Definition
  const envelopeDefinitions = getSeedEnvelopeDefinitions(
    everydayAccount.id,
    misaAccount.id,
    personalSaverAccount.id,
    userId
  );

  const insertedEnvelopes = await db.insert(envelopes).values(
    envelopeDefinitions.map((p) => ({
      name: p.name,
      envelopeType: p.envelopeType,
      fundingMode: "fundingMode" in p ? (p.fundingMode as "TARGET_BALANCE" | "RECURRING") : "TARGET_BALANCE",
      bankAccountId: p.bankAccountId,
      safetyBufferFloor: "safetyBufferFloor" in p ? p.safetyBufferFloor : "0.00",
      monthlyAmount: "monthlyAmount" in p ? p.monthlyAmount : null,
      enteredAmount: "enteredAmount" in p ? p.enteredAmount : null,
      budgetFrequency: "budgetFrequency" in p ? p.budgetFrequency : "MONTHLY",
      startDate: "startDate" in p ? p.startDate : null,
      endDate: "endDate" in p ? p.endDate : null,
      rrule: "rrule" in p ? p.rrule : null,
      targetAmount: "targetAmount" in p ? p.targetAmount : null,
      isPriority: p.isPriority,
      isSurplusTarget: p.isSurplusTarget,
      isPrivate: p.isPrivate,
      generateEvents: "generateEvents" in p ? (p.generateEvents as boolean) : true,
      userId: "userId" in p ? (p.userId as string) : null,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    }))
  ).returning();

  const envelopeMap = new Map<string, typeof insertedEnvelopes[0]>();
  for (let i = 0; i < envelopeDefinitions.length; i++) {
    envelopeMap.set(envelopeDefinitions[i].key, insertedEnvelopes[i]);
  }

  // 3. Income Sources
  const [keshSalary] = await db
    .insert(incomeSources)
    .values({ name: "Kesh - Salary (Fortnightly)", amount: "6205.08", receivingAccountId: everydayAccount.id, rrule: "FREQ=WEEKLY;INTERVAL=2", startDate: "2026-07-02", tenantId, appId, createdBy: userId, updatedBy: userId })
    .returning();

  const [snehaSalary] = await db
    .insert(incomeSources)
    .values({ name: "Sneha - Salary (Fortnightly)", amount: "3024.47", receivingAccountId: everydayAccount.id, rrule: "FREQ=WEEKLY;INTERVAL=2", startDate: "2026-07-02", tenantId, appId, createdBy: snehaUserId, updatedBy: snehaUserId })
    .returning();

  const [advisoryIncome] = await db
    .insert(incomeSources)
    .values({
      name: "Kesh - Advisory Consulting",
      amount: "1200.00",
      incomeType: "IRREGULAR" as const,
      contributionMode: "PERCENTAGE" as const,
      contributionValue: "50.00",
      receivingAccountId: personalSaverAccount.id,
      rrule: "FREQ=MONTHLY",
      startDate: "2026-11-26",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  // 4. Payday Dates & Schedule
  const paydays = SEED_PAYDAYS;

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

  const insertedIncomeEvents = await db.insert(incomeEvents).values([
    ...incomeEventsToInsert,
    {
      incomeSourceId: advisoryIncome.id,
      name: "Kesh - Advisory Retainer",
      expectedDate: "2026-11-26",
      expectedAmount: "1200.00",
      status: "PENDING" as const,
      note: "50% household contribution mode (irregular income)",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]).returning();

  // 5. Historical Allocation Plans for Paydays 1 to 6
  const pastSplitsData = SEED_PAST_SPLITS_DATA;

  for (const past of pastSplitsData) {
    const keshEv = insertedIncomeEvents.find((e: any) => e.expectedDate === past.date && e.name === "Kesh - Salary")!;
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
      const targetEnvelope = envelopeMap.get(key)!;
      return {
        planId: plan.id,
        envelopeId: targetEnvelope.id,
        proposedAmount: (amt as number).toFixed(2),
        confirmedAmount: (amt as number).toFixed(2),
        reasoning: `Confirmed FY27 paycheck allocation split for ${targetEnvelope.name}`,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      };
    });

    await db.insert(allocationPlanLines).values(planLinesToInsert);

    const snehaEv = insertedIncomeEvents.find((e: any) => e.expectedDate === past.date && e.name === "Sneha - Salary");
    if (snehaEv) {
      await db.insert(allocationPlans).values({
        incomeEventId: snehaEv.id,
        totalIncomeAmount: paydayInfo.sneha,
        status: "CONFIRMED" as const,
        confirmedAt: new Date(past.date + "T09:00:00Z"),
        tenantId,
        appId,
        createdBy: snehaUserId,
        updatedBy: snehaUserId,
      });
    }
  }

  // 6. Transaction Ledger
  const openingBalances = SEED_OPENING_BALANCES;

  const openingLedgerRows = openingBalances.map((ob) => {
    const targetEnvelope = envelopeMap.get(ob.key)!;
    const targetAccount = ob.key === "everyday" ? everydayAccount.id : ob.key === "kaesava_vault" ? personalSaverAccount.id : misaAccount.id;
    return {
      envelopeId: targetEnvelope.id,
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

  const paydayLedgerRows = pastSplitsData.flatMap((past) => {
    return Object.entries(past.splits).map(([key, amt]) => {
      const targetEnvelope = envelopeMap.get(key)!;
      const targetAccount = key === "everyday" ? everydayAccount.id : misaAccount.id;
      const numAmt = amt as number;
      const isPositive = numAmt >= 0;
      const absAmount = Math.abs(numAmt).toFixed(2);
      return {
        envelopeId: targetEnvelope.id,
        bankAccountId: targetAccount,
        flowType: (isPositive ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT",
        transactionType: (isPositive ? "INCOME_SPLIT" : "EXPENSE") as "INCOME_SPLIT" | "EXPENSE",
        amount: absAmount,
        idempotencyKey: `payday-split-${key}-${past.date}`,
        note: isPositive ? `Payday Allocation — ${targetEnvelope.name}` : `Temporary Cashflow Cushion Drawdown — ${targetEnvelope.name}`,
        source: "AUTO" as const,
        recordedAt: new Date(`${past.date}T09:05:00Z`),
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      };
    });
  });

  const historicalDebits = SEED_HISTORICAL_DEBITS;

  const historicalDebitRows = historicalDebits.map((hd, idx) => {
    const targetEnvelope = envelopeMap.get(hd.key)!;
    const targetAccount = hd.key === "everyday" ? everydayAccount.id : misaAccount.id;
    return {
      envelopeId: targetEnvelope.id,
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

  await db.insert(transactionLedger).values([
    ...openingLedgerRows,
    ...paydayLedgerRows,
    ...historicalDebitRows,
  ]);

  // 7. Scheduled Bill Events, Ad-hoc Events & Transfers
  await seedHouseholdEvents(db, {
    tenantId,
    appId,
    userId,
    misaAccountId: misaAccount.id,
    envelopeMap,
  });

  // 8. Saved Drafts, Allocation Strategies & File Notes
  await seedStrategiesDraftsAndNotes(db, {
    tenantId,
    appId,
    userId,
    insertedIncomeEvents,
    envelopeMap,
  });
}

