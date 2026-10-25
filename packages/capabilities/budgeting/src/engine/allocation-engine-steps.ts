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
  const sorted = [...billBuckets].sort((a, b) => (a.isEssential && !b.isEssential ? -1 : 1));
  for (const b of sorted) {
    const dueCents = envImmediateExpensesMap.get(b.id) ?? 0;
    if (dueCents <= 0) continue;
    const curBal = Math.max(0, ctx.runningBalances.get(b.id) ?? toCents(b.currentBalance));
    const shortfall = Math.max(0, dueCents - curBal);
    if (shortfall <= 0) continue;

    const sym = ctx.currencySymbol;
    const alloc = allocate(
      ctx,
      b,
      shortfall,
      `Immediate bill coverage (${sym}${toDollars(dueCents).toFixed(2)} due within cycle + ${ctx.bufferDays}d buffer): ${sym}${toDollars(Math.min(ctx.remainingCents, shortfall)).toFixed(2)} allocated.`
    );
    if (alloc > 0) {
      ctx.priorBillAllocated.set(b.id, (ctx.priorBillAllocated.get(b.id) ?? 0) + alloc);
    }
  }
}

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

export function runStep5ProRataBills(
  ctx: StepContext,
  billBuckets: EngineBucket[],
  futureExpenses: UpcomingExpenseItem[],
  paycheckDate: Date
): void {
  const sym = ctx.currencySymbol;
  for (const b of billBuckets) {
    const monthlyCents = toCents(b.monthlyAmount ?? b.targetAmount ?? 0);
    const baseCycleCents = Math.round(monthlyCents * ctx.cycleFactor);

    let forwardPaceCents = 0;
    const bucketFuture = futureExpenses.filter((e) => (e.envelopeId || e.poolId) === b.id);
    for (const exp of bucketFuture) {
      const diffMs = new Date(exp.dueDate).getTime() - paycheckDate.getTime();
      const diffDays = Math.max(1, diffMs / (1000 * 60 * 60 * 24));
      const paychecks = Math.max(1, Math.floor(diffDays / ctx.regularCycleDays));
      const pace = Math.round(toCents(exp.amount) / paychecks);
      if (pace > forwardPaceCents) forwardPaceCents = pace;
    }

    const targetCents = Math.max(baseCycleCents, forwardPaceCents);
    const priorAlloc = ctx.priorBillAllocated.get(b.id) ?? 0;
    const additional = Math.max(0, targetCents - priorAlloc);

    if (additional > 0) {
      const prefix = ctx.isIrregular ? `[${ctx.regularCycleDays}d runway] ` : "";
      const alloc = allocate(
        ctx,
        b,
        additional,
        `${prefix}Pro-rata bill allocation (${sym}${toDollars(monthlyCents).toFixed(2)}/mo): ${sym}${toDollars(Math.min(ctx.remainingCents, additional)).toFixed(2)} allocated.`
      );
      if (alloc === 0) {
        ctx.linesMap.get(b.id)?.reasonings.push(`Pro-rata bill target (${sym}${toDollars(monthlyCents).toFixed(2)}/mo): ${sym}0 allocated (insufficient income).`);
      }
    }
  }
}

export function runStep6Goals(
  ctx: StepContext,
  goals: EngineBucket[],
  paycheckDate: Date,
  baseNextCutoffTime: number
): void {
  const sym = ctx.currencySymbol;
  const sorted = [...goals].sort((a, b) => {
    if (!a.targetDate) return 1;
    if (!b.targetDate) return -1;
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
  });

  for (const b of sorted) {
    const targetCents = toCents(b.targetAmount ?? 0);
    const curBal = Math.max(0, ctx.runningBalances.get(b.id) ?? toCents(b.currentBalance));
    const gap = Math.max(0, targetCents - curBal);

    if (b.type === "ONGOING_GOAL" || b.goalMode === "ONGOING") {
      const needed = Math.round(targetCents * ctx.cycleFactor);
      if (needed > 0) {
        const alloc = allocate(
          ctx,
          b,
          needed,
          `Ongoing goal contribution (${sym}${toDollars(targetCents).toFixed(2)}/mo): ${sym}${toDollars(Math.min(ctx.remainingCents, needed)).toFixed(2)} allocated.`
        );
        if (alloc === 0) {
          ctx.linesMap.get(b.id)?.reasonings.push(`Ongoing goal contribution: ${sym}0 allocated (insufficient income).`);
        }
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
      const alloc = allocate(
        ctx,
        b,
        needed,
        `Target ${sym}${toDollars(targetCents).toFixed(2)} by ${b.targetDate ?? "12-mo"}: ${sym}${toDollars(Math.min(ctx.remainingCents, needed)).toFixed(2)} allocated.`
      );
      if (alloc === 0) {
        ctx.linesMap.get(b.id)?.reasonings.push(`Goal target: ${sym}0 allocated (insufficient income).`);
      }
    }
  }
}

export function runStep7SurplusSweep(ctx: StepContext, buckets: EngineBucket[]): void {
  if (ctx.remainingCents <= 0) return;
  const sym = ctx.currencySymbol;

  const eligibleSurplus =
    buckets.find((b) => b.isSurplusTarget && ctx.isBucketEligible(b)) ||
    buckets.find((b) => !b.isPrivate && (b.type === "TARGET_GOAL" || b.type === "ONGOING_GOAL" || b.type === "GOAL") && ctx.isBucketEligible(b)) ||
    buckets.find((b) => !b.isPrivate && b.type === "EVERYDAY" && ctx.isBucketEligible(b)) ||
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
