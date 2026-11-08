import { EngineBucket, UpcomingExpenseItem } from "./allocation-engine.js";
import { toCents, toDollars } from "./allocation-engine-utils.js";

export interface StepContext {
  remainingCents: number;
  linesMap: Map<string, { bucketName: string; amountCents: number; reasonings: string[] }>;
  runningBalances: Map<string, number>;
  priorBillAllocated: Map<string, number>;
  currencySymbol: string;
  cycleFactor: number;
  regularCycleDays: number;
  bufferDays: number;
  bufferedCutoffDateStr: string;
  isIrregular: boolean;
  isBucketEligible: (b: EngineBucket) => boolean;
}

export function allocate(
  ctx: StepContext,
  bucket: EngineBucket,
  amountCents: number,
  reasoning: string
): number {
  if (amountCents <= 0 || !ctx.isBucketEligible(bucket)) return 0;
  const actual = Math.min(ctx.remainingCents, amountCents);
  if (actual <= 0) return 0;

  const line = ctx.linesMap.get(bucket.id)!;
  line.amountCents += actual;
  line.reasonings.push(reasoning);
  ctx.remainingCents -= actual;

  const curBal = ctx.runningBalances.get(bucket.id) ?? 0;
  ctx.runningBalances.set(bucket.id, curBal + actual);
  return actual;
}

export function runStep1ImmediateBills(
  ctx: StepContext,
  billBuckets: EngineBucket[],
  envImmediateExpensesMap: Map<string, number>
): void {
  const eligibleBills = billBuckets.filter((b) => ctx.isBucketEligible(b));
  const billDemands: Array<{ bucket: EngineBucket; dueCents: number; shortfall: number }> = [];
  let totalShortfall = 0;

  for (const b of eligibleBills) {
    const dueCents = envImmediateExpensesMap.get(b.id) ?? 0;
    if (dueCents <= 0) continue;
    const curBal = Math.max(0, ctx.runningBalances.get(b.id) ?? toCents(b.currentBalance));
    const shortfall = Math.max(0, dueCents - curBal);
    if (shortfall > 0) {
      billDemands.push({ bucket: b, dueCents, shortfall });
      totalShortfall += shortfall;
    }
  }

  if (billDemands.length === 0 || totalShortfall <= 0 || ctx.remainingCents <= 0) return;

  const sym = ctx.currencySymbol;
  if (ctx.remainingCents >= totalShortfall) {
    for (const item of billDemands) {
      const reasoning = `Immediate bill coverage (${sym}${toDollars(item.dueCents).toFixed(2)} due within cycle + ${ctx.bufferDays}d buffer): ${sym}${toDollars(item.shortfall).toFixed(2)} allocated.`;
      const alloc = allocate(ctx, item.bucket, item.shortfall, reasoning);
      if (alloc > 0) {
        ctx.priorBillAllocated.set(item.bucket.id, (ctx.priorBillAllocated.get(item.bucket.id) ?? 0) + alloc);
      }
    }
  } else {
    // Proportional fair-share distribution
    const available = ctx.remainingCents;
    let distributed = 0;
    const allocations: Array<{ item: typeof billDemands[0]; alloc: number }> = [];

    for (const item of billDemands) {
      const share = Math.floor((available * item.shortfall) / totalShortfall);
      allocations.push({ item, alloc: share });
      distributed += share;
    }

    let remainder = available - distributed;
    allocations.sort((a, b) => b.item.shortfall - a.item.shortfall);
    for (let i = 0; i < allocations.length && remainder > 0; i++) {
      allocations[i].alloc += 1;
      remainder -= 1;
    }

    for (const { item, alloc } of allocations) {
      const reasoning = `Immediate bill coverage (${sym}${toDollars(item.dueCents).toFixed(2)} due within cycle + ${ctx.bufferDays}d buffer): ${sym}${toDollars(alloc).toFixed(2)} allocated (${sym}${toDollars(item.shortfall - alloc).toFixed(2)} shortfall).`;
      const actual = allocate(ctx, item.bucket, alloc, reasoning);
      if (actual > 0) {
        ctx.priorBillAllocated.set(item.bucket.id, (ctx.priorBillAllocated.get(item.bucket.id) ?? 0) + actual);
      }
    }
  }
}

export const runStep2ImmediateBills = runStep1ImmediateBills;

export function runStep2DeficitRepair(ctx: StepContext, buckets: EngineBucket[]): void {
  const sym = ctx.currencySymbol;
  for (const b of buckets) {
    const curBal = ctx.runningBalances.get(b.id) ?? toCents(b.currentBalance);
    if (curBal < 0) {
      const deficit = Math.abs(curBal);
      allocate(
        ctx,
        b,
        deficit,
        `Deficit repair for negative balance (-${sym}${toDollars(deficit).toFixed(2)}): ${sym}${toDollars(Math.min(ctx.remainingCents, deficit)).toFixed(2)} allocated.`
      );
    }
  }
}

export function runStep3BillsSafetyFloor(ctx: StepContext, billBuckets: EngineBucket[]): void {
  const sym = ctx.currencySymbol;
  for (const b of billBuckets) {
    const floorCents = toCents(b.safetyBufferFloor ?? 0);
    if (floorCents <= 0) continue;
    const curBal = Math.max(0, ctx.runningBalances.get(b.id) ?? toCents(b.currentBalance));
    const deficit = Math.max(0, floorCents - curBal);
    if (deficit > 0) {
      const alloc = allocate(
        ctx,
        b,
        deficit,
        `Bills safety buffer cushion (floor ${sym}${toDollars(floorCents).toFixed(2)}): ${sym}${toDollars(Math.min(ctx.remainingCents, deficit)).toFixed(2)} allocated.`
      );
      if (alloc > 0) {
        ctx.priorBillAllocated.set(b.id, (ctx.priorBillAllocated.get(b.id) ?? 0) + alloc);
      }
    }
  }
}

export function runStep4EverydayAllowance(ctx: StepContext, everydayBuckets: EngineBucket[]): void {
  const sym = ctx.currencySymbol;
  for (const b of everydayBuckets) {
    const monthlyAllowance = toCents(b.monthlyAmount ?? b.targetAmount ?? 0);
    const cycleAllowance = Math.round(monthlyAllowance * ctx.cycleFactor);
    const curBal = Math.max(0, ctx.runningBalances.get(b.id) ?? toCents(b.currentBalance));
    const floorCents = toCents(b.safetyBufferFloor ?? 0);
    const floorDeficit = Math.max(0, floorCents - curBal);
    const needed = cycleAllowance + floorDeficit;

    if (needed > 0) {
      const floorMsg = floorCents > 0 ? ` (incl ${sym}${toDollars(floorCents).toFixed(2)} safety floor)` : "";
      const prefix = ctx.isIrregular ? `[${ctx.regularCycleDays}d runway] ` : "";
      const alloc = allocate(
        ctx,
        b,
        needed,
        `${prefix}Everyday living allowance (${sym}${toDollars(monthlyAllowance).toFixed(2)}/mo across ${ctx.regularCycleDays} days)${floorMsg}: ${sym}${toDollars(Math.min(ctx.remainingCents, needed)).toFixed(2)} allocated.`
      );
      if (alloc === 0) {
        ctx.linesMap.get(b.id)?.reasonings.push(`Everyday living allowance: ${sym}0 allocated.`);
      }
    }
  }
}

export const runStep1EverydayAllowance = runStep4EverydayAllowance;

export function runStep5ProRataBills(
  ctx: StepContext,
  billBuckets: EngineBucket[],
  futureExpenses: UpcomingExpenseItem[],
  paycheckDate: Date
): void {
  const eligibleBills = billBuckets.filter((b) => ctx.isBucketEligible(b));
  const billDemands: Array<{
    bucket: EngineBucket;
    monthlyCents: number;
    additional: number;
  }> = [];
  let totalDemand = 0;

  for (const b of eligibleBills) {
    const monthlyCents = toCents(b.monthlyAmount ?? b.targetAmount ?? 0);
    const baseCycleCents = Math.round(monthlyCents * ctx.cycleFactor);

    let forwardPaceCents = 0;
    const bucketFuture = futureExpenses.filter((e) => (e.envelopeId || e.poolId) === b.id);
    const curBal = Math.max(0, ctx.runningBalances.get(b.id) ?? toCents(b.currentBalance));

    for (const exp of bucketFuture) {
      const diffMs = new Date(exp.dueDate).getTime() - paycheckDate.getTime();
      const diffDays = Math.max(1, diffMs / (1000 * 60 * 60 * 24));
      const paychecks = Math.max(1, Math.floor(diffDays / ctx.regularCycleDays));
      const expCents = toCents(exp.amount);
      const remainingGapCents = Math.max(0, expCents - curBal);
      const pace = Math.round(remainingGapCents / paychecks);
      if (pace > forwardPaceCents) forwardPaceCents = pace;
    }

    const targetCents = Math.max(baseCycleCents, forwardPaceCents);
    const priorAlloc = ctx.priorBillAllocated.get(b.id) ?? 0;
    const additional = Math.max(0, targetCents - priorAlloc);
    if (additional > 0) {
      billDemands.push({ bucket: b, monthlyCents, additional });
      totalDemand += additional;
    }
  }

  if (billDemands.length === 0) return;

  const sym = ctx.currencySymbol;
  const prefix = ctx.isIrregular ? `[${ctx.regularCycleDays}d runway] ` : "";

  if (ctx.remainingCents >= totalDemand) {
    for (const item of billDemands) {
      allocate(
        ctx,
        item.bucket,
        item.additional,
        `${prefix}Pro-rata bill allocation (${sym}${toDollars(item.monthlyCents).toFixed(2)}/mo): ${sym}${toDollars(item.additional).toFixed(2)} allocated.`
      );
    }
  } else if (ctx.remainingCents > 0) {
    const available = ctx.remainingCents;
    let distributed = 0;
    const allocations: Array<{ item: typeof billDemands[0]; alloc: number }> = [];

    for (const item of billDemands) {
      const share = Math.floor((available * item.additional) / totalDemand);
      allocations.push({ item, alloc: share });
      distributed += share;
    }

    let remainder = available - distributed;
    allocations.sort((a, b) => b.item.additional - a.item.additional);
    for (let i = 0; i < allocations.length && remainder > 0; i++) {
      allocations[i].alloc += 1;
      remainder -= 1;
    }

    for (const { item, alloc } of allocations) {
      allocate(
        ctx,
        item.bucket,
        alloc,
        `${prefix}Pro-rata bill allocation (${sym}${toDollars(item.monthlyCents).toFixed(2)}/mo): ${sym}${toDollars(alloc).toFixed(2)} allocated (${sym}${toDollars(item.additional - alloc).toFixed(2)} shortfall).`
      );
    }
  } else {
    for (const item of billDemands) {
      ctx.linesMap.get(item.bucket.id)?.reasonings.push(
        `Pro-rata bill target (${sym}${toDollars(item.monthlyCents).toFixed(2)}/mo): ${sym}0 allocated (insufficient income).`
      );
    }
  }
}

export function runStep6Goals(
  ctx: StepContext,
  goals: EngineBucket[],
  paycheckDate: Date,
  baseNextCutoffTime: number
): void {
  const eligibleGoals = goals.filter((b) => ctx.isBucketEligible(b));
  const goalDemands: Array<{
    bucket: EngineBucket;
    needed: number;
    description: string;
  }> = [];
  let totalDemand = 0;
  const sym = ctx.currencySymbol;

  for (const b of eligibleGoals) {
    const rawTarget = b.targetAmount ?? b.monthlyAmount ?? b.enteredAmount ?? 0;
    const targetCents = toCents(rawTarget);
    const curBal = Math.max(0, ctx.runningBalances.get(b.id) ?? toCents(b.currentBalance));
    const gap = Math.max(0, targetCents - curBal);

    if (b.type === "ONGOING_GOAL" || b.goalMode === "ONGOING") {
      const ongoingMonthly = b.monthlyAmount ?? b.enteredAmount ?? b.targetAmount ?? 0;
      const ongoingCents = toCents(ongoingMonthly);
      const needed = Math.round(ongoingCents * ctx.cycleFactor);
      if (needed > 0) {
        goalDemands.push({
          bucket: b,
          needed,
          description: `Ongoing goal contribution (${sym}${toDollars(ongoingCents).toFixed(2)}/mo)`,
        });
        totalDemand += needed;
      }
      continue;
    }

    if (gap <= 0) continue;
    let needed = gap;

    if (b.targetDate) {
      const targetTime = new Date(b.targetDate).getTime();
      if (targetTime > baseNextCutoffTime) {
        const diffDays = Math.max(1, (targetTime - paycheckDate.getTime()) / (1000 * 60 * 60 * 24));
        const remainingPaychecks = Math.max(1, Math.floor(diffDays / ctx.regularCycleDays));
        needed = Math.min(gap, Math.round(gap / remainingPaychecks));
      }
    } else {
      const remainingPaychecks = Math.max(1, Math.round(365 / ctx.regularCycleDays));
      needed = Math.min(gap, Math.round(gap / remainingPaychecks));
    }

    if (needed > 0) {
      goalDemands.push({
        bucket: b,
        needed,
        description: `Target ${sym}${toDollars(targetCents).toFixed(2)} by ${b.targetDate ?? "12-mo"}`,
      });
      totalDemand += needed;
    }
  }

  if (goalDemands.length === 0) return;

  if (ctx.remainingCents >= totalDemand) {
    for (const item of goalDemands) {
      allocate(
        ctx,
        item.bucket,
        item.needed,
        `${item.description}: ${sym}${toDollars(item.needed).toFixed(2)} allocated.`
      );
    }
  } else if (ctx.remainingCents > 0) {
    const available = ctx.remainingCents;
    let distributed = 0;
    const allocations: Array<{ item: typeof goalDemands[0]; alloc: number }> = [];

    for (const item of goalDemands) {
      const share = Math.floor((available * item.needed) / totalDemand);
      allocations.push({ item, alloc: share });
      distributed += share;
    }

    let remainder = available - distributed;
    allocations.sort((a, b) => b.item.needed - a.item.needed);
    for (let i = 0; i < allocations.length && remainder > 0; i++) {
      allocations[i].alloc += 1;
      remainder -= 1;
    }

    for (const { item, alloc } of allocations) {
      allocate(
        ctx,
        item.bucket,
        alloc,
        `${item.description}: ${sym}${toDollars(alloc).toFixed(2)} allocated (${sym}${toDollars(item.needed - alloc).toFixed(2)} shortfall).`
      );
    }
  } else {
    for (const item of goalDemands) {
      ctx.linesMap.get(item.bucket.id)?.reasonings.push(
        `${item.description}: ${sym}0 allocated (insufficient income).`
      );
    }
  }
}

export function runStepFixedAmount(
  ctx: StepContext,
  buckets: EngineBucket[],
  targetEnvelopeId?: string | null,
  amountDollars?: number
): void {
  if (!targetEnvelopeId || !amountDollars || amountDollars <= 0) return;
  const target = buckets.find((b) => b.id === targetEnvelopeId);
  if (!target) return;
  const amountCents = toCents(amountDollars);
  const sym = ctx.currencySymbol;
  allocate(
    ctx,
    target,
    amountCents,
    `Fixed allocation rule: ${sym}${toDollars(Math.min(ctx.remainingCents, amountCents)).toFixed(2)} allocated to ${target.name}.`
  );
}

export function runStepPercentageSplit(
  ctx: StepContext,
  buckets: EngineBucket[],
  targetEnvelopeId?: string | null,
  percentage?: number
): void {
  if (!targetEnvelopeId || !percentage || percentage <= 0 || ctx.remainingCents <= 0) return;
  const target = buckets.find((b) => b.id === targetEnvelopeId);
  if (!target) return;
  const pct = Math.min(100, Math.max(0, percentage));
  const amountCents = Math.round(ctx.remainingCents * (pct / 100));
  if (amountCents <= 0) return;
  const sym = ctx.currencySymbol;
  allocate(
    ctx,
    target,
    amountCents,
    `Percentage split rule (${pct}% of remaining funds): ${sym}${toDollars(amountCents).toFixed(2)} allocated to ${target.name}.`
  );
}

export function runStep7SurplusSweep(
  ctx: StepContext,
  buckets: EngineBucket[],
  targetEnvelopeId?: string | null
): void {
  if (ctx.remainingCents <= 0) return;
  const sym = ctx.currencySymbol;

  const targetFromConfig = targetEnvelopeId
    ? buckets.find((b) => b.id === targetEnvelopeId && ctx.isBucketEligible(b))
    : null;

  const eligibleSurplus =
    targetFromConfig ||
    buckets.find((b) => b.isSurplusTarget && ctx.isBucketEligible(b)) ||
    buckets.find((b) => !b.isPrivate && b.type === "EVERYDAY" && ctx.isBucketEligible(b)) ||
    buckets.find((b) => !b.isPrivate && (b.type === "TARGET_GOAL" || b.type === "ONGOING_GOAL" || b.type === "GOAL") && ctx.isBucketEligible(b)) ||
    buckets.find((b) => ctx.isBucketEligible(b));

  if (eligibleSurplus) {
    const toAlloc = ctx.remainingCents;
    allocate(
      ctx,
      eligibleSurplus,
      toAlloc,
      `Swept residual excess surplus of ${sym}${toDollars(toAlloc).toFixed(2)} to designated surplus envelope (${eligibleSurplus.name}).`
    );
  }
}
