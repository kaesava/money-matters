import {
  allocationPlans,
  allocationPlanLines,
  allocationStrategies,
  allocationStrategySteps,
  fileNotes,
} from "@money-matters/db";
import { CANONICAL_ALLOCATION_PRESETS } from "@money-matters/types";

export async function seedStrategiesDraftsAndNotes(
  db: any,
  params: {
    tenantId: string;
    appId: string;
    userId: string;
    insertedIncomeEvents: Array<{ id: string; expectedDate: string; name: string | null }>;
    envelopeMap: Map<string, { id: string }>;
  }
) {
  const { tenantId, appId, userId, insertedIncomeEvents, envelopeMap } = params;

  // Saved PENDING Draft Allocation Plan on upcoming 2026-11-19 payday (Document Draft Model)
  const upcomingDraftEvent = insertedIncomeEvents.find(
    (e) => e.expectedDate === "2026-11-19" && e.name === "Kesh - Salary"
  );
  if (upcomingDraftEvent) {
    const [draftPlan] = await db
      .insert(allocationPlans)
      .values({
        incomeEventId: upcomingDraftEvent.id,
        totalIncomeAmount: "6205.08",
        status: "PENDING" as const,
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const everydayEnv = envelopeMap.get("everyday")!;
    const schoolEnv = envelopeMap.get("school_fees")!;
    const surplusEnv = envelopeMap.get("surplus_offset")!;
    await db.insert(allocationPlanLines).values([
      {
        planId: draftPlan.id,
        envelopeId: everydayEnv.id,
        proposedAmount: "2641.54",
        reasoning: "Saved custom draft: everyday allowance",
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        planId: draftPlan.id,
        envelopeId: schoolEnv.id,
        proposedAmount: "1500.00",
        reasoning: "Saved custom draft: Q4 school fees top-up",
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        planId: draftPlan.id,
        envelopeId: surplusEnv.id,
        proposedAmount: "2063.54",
        reasoning: "Saved custom draft: remaining surplus to offset",
        tenantId,
        appId,
        createdBy: userId,
        updatedBy: userId,
      },
    ]);
  }

  // Allocation Strategies (Household Balanced + Kaesava Personal Pay Yourself First)
  const [householdStrategy, personalStrategy] = await db
    .insert(allocationStrategies)
    .values([
      {
        tenantId,
        appId,
        name: "Standard Balanced",
        presetKey: "BALANCED",
        description: "Bills due soon and everyday living are protected first, followed by upcoming bills and savings goals.",
        isDefault: true,
        isPrivate: false,
        userId: null,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        tenantId,
        appId,
        name: "Personal Pay Yourself First",
        presetKey: "PAY_YOURSELF_FIRST",
        description: "Personal bills due soon and private savings goals are funded before discretionary spending.",
        isDefault: true,
        isPrivate: true,
        userId,
        createdBy: userId,
        updatedBy: userId,
      },
    ])
    .returning();

  const surplusEnvelope = envelopeMap.get("surplus_offset")!;
  const personalVaultEnvelope = envelopeMap.get("kaesava_vault")!;
  await db.insert(allocationStrategySteps).values([
    ...CANONICAL_ALLOCATION_PRESETS.BALANCED.steps.map((step, idx) => ({
      tenantId,
      appId,
      strategyId: householdStrategy.id,
      orderIndex: idx,
      stepType: step.stepType,
      targetEnvelopeId: step.stepType === "SURPLUS_SWEEP" ? surplusEnvelope.id : null,
      createdBy: userId,
      updatedBy: userId,
    })),
    ...CANONICAL_ALLOCATION_PRESETS.PAY_YOURSELF_FIRST.steps.map((step, idx) => ({
      tenantId,
      appId,
      strategyId: personalStrategy.id,
      orderIndex: idx,
      stepType: step.stepType,
      targetEnvelopeId: step.stepType === "SURPLUS_SWEEP" ? personalVaultEnvelope.id : null,
      createdBy: userId,
      updatedBy: userId,
    })),
  ]);

  // File Notes (Shared Household Note + Private Stealth Note)
  await db.insert(fileNotes).values([
    {
      entityType: "ENVELOPE",
      entityId: envelopeMap.get("school_fees")!.id,
      comment: "FY27 tuition schedule confirmed; quarterly instalments due Term 1-4.",
      isPrivate: false,
      userId: null,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      entityType: "ENVELOPE",
      entityId: personalVaultEnvelope.id,
      comment: "Personal discretionary reserve for anniversary gift & hobby gear.",
      isPrivate: true,
      userId,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);
}
