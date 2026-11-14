import { EngineBucket } from "./allocation-engine.js";
import { toCents, toDollars } from "./allocation-engine-utils.js";
import { allocate, type StepContext } from "./allocation-engine-steps.js";

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

    if (b.fundingMode === "RECURRING") {
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
    buckets.find((b) => !b.isPrivate && b.type === "GOAL" && ctx.isBucketEligible(b)) ||
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

