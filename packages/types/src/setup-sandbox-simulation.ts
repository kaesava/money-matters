import { EstimatedCategoryItem, IncomeItem, UserGoalItem } from "./onboarding-quiz.js";

export interface SandboxSimulationInput {
  paycheckAmount: number;
  incomes?: IncomeItem[];
  bankAccounts?: Array<{
    id: string;
    name: string;
    lastKnownBalance?: string;
    unbudgetedBuffer?: string | null;
    isPrivate?: boolean | null;
  }>;
  activeEveryday?: EstimatedCategoryItem[];
  activeRegular?: EstimatedCategoryItem[];
  activeGoals?: EstimatedCategoryItem[];
  goals?: UserGoalItem[];
}

export interface SandboxAllocationLine {
  name: string;
  type: "EVERYDAY" | "BILL" | "GOAL";
  allocatedAmount: number;
  isSurplusTarget?: boolean;
}

export interface SandboxSimulationResult {
  regularCycleDays: number;
  cycleFactor: number;
  billsAllocated: number;
  goalsAllocated: number;
  safeToSpend: number;
  surplusSwept: number;
  surplusTargetName: string;
  lines: SandboxAllocationLine[];
}

interface InternalSandboxBucket {
  name: string;
  type: "EVERYDAY" | "BILL" | "GOAL";
  isPriority: boolean;
  isSurplusTarget: boolean;
  neededCents: number;
}

function getCycleDaysFromIncome(income?: IncomeItem): number {
  const freq = income?.frequency || "FORTNIGHTLY";
  const interval = Math.max(1, income?.interval || 1);
  if (freq === "WEEKLY") return 7 * interval;
  if (freq === "FORTNIGHTLY") return 14 * interval;
  if (freq === "QUARTERLY") return 91 * interval;
  if (freq === "ANNUALLY") return 365 * interval;
  return 30 * interval;
}

function computeCycleFactor(days: number): number {
  if (days === 14) return 12 / 26;
  if (days === 7) return 12 / 52;
  if (days >= 28 && days <= 31) return 1.0;
  return (12 * days) / 365;
}

function distributeGroup(
  remainingCents: number,
  demands: Array<{ idx: number; neededCents: number }>,
  allocatedByIdx: Map<number, number>
): number {
  const totalDemand = demands.reduce((sum, d) => sum + d.neededCents, 0);
  if (totalDemand <= 0 || remainingCents <= 0) return remainingCents;
  if (remainingCents >= totalDemand) {
    for (const d of demands) {
      allocatedByIdx.set(d.idx, (allocatedByIdx.get(d.idx) ?? 0) + d.neededCents);
    }
    return remainingCents - totalDemand;
  }
  const shares = demands.map((d) => ({
    idx: d.idx,
    neededCents: d.neededCents,
    share: Math.floor((remainingCents * d.neededCents) / totalDemand),
  }));
  let rem = remainingCents - shares.reduce((s, item) => s + item.share, 0);
  shares.sort((a, b) => b.neededCents - a.neededCents);
  for (let i = 0; i < shares.length && rem > 0; i++) {
    shares[i].share += 1;
    rem -= 1;
  }
  for (const s of shares) {
    allocatedByIdx.set(s.idx, (allocatedByIdx.get(s.idx) ?? 0) + s.share);
  }
  return 0;
}

function buildSandboxBuckets(
  input: SandboxSimulationInput,
  cycleFactor: number
): InternalSandboxBucket[] {
  const everydayMonthly = (input.activeEveryday || []).reduce((s, c) => s + (c.monthlyAud || 0), 0);
  const floorVal = (input.activeEveryday || []).reduce((s, c) => s + (c.safetyBufferFloor || 0), 0);
  const userGoals = input.goals || [];
  return [
    {
      name: "Everyday",
      type: "EVERYDAY",
      isPriority: true,
      isSurplusTarget: false,
      neededCents: Math.round((everydayMonthly * cycleFactor + floorVal) * 100),
    },
    ...(input.activeRegular || []).map((b) => ({
      name: b.name,
      type: "BILL" as const,
      isPriority: b.isPriority ?? true,
      isSurplusTarget: Boolean(b.isSurplusTarget),
      neededCents: Math.round((b.monthlyAud || 0) * cycleFactor * 100),
    })),
    ...(input.activeGoals || []).map((g) => {
      const ug = userGoals.find((u) => u.name.trim().toLowerCase() === g.name.trim().toLowerCase());
      return {
        name: g.name,
        type: "GOAL" as const,
        isPriority: ug?.isPriority ?? g.isPriority ?? true,
        isSurplusTarget: Boolean(ug?.isSurplusTarget ?? g.isSurplusTarget),
        neededCents: Math.round((g.monthlyAud || 0) * cycleFactor * 100),
      };
    }),
  ];
}

function resolveSurplusIndex(buckets: InternalSandboxBucket[]): number {
  const explicitIdx = buckets.findIndex((b) => b.isSurplusTarget);
  if (explicitIdx !== -1) return explicitIdx;
  const fallbackIdx = buckets.findIndex(
    (b) => b.type === "GOAL" && (b.name.toLowerCase().includes("emergency") || b.name.toLowerCase().includes("reserve"))
  );
  return fallbackIdx !== -1 ? fallbackIdx : 0;
}

function executeSandboxWaterfall(
  paycheckAmount: number,
  buckets: InternalSandboxBucket[],
  surplusIdx: number
): { allocated: Map<number, number>; surplusSweptCents: number } {
  let remainingCents = Math.max(0, Math.round((paycheckAmount || 0) * 100));
  const allocated = new Map<number, number>();
  const steps: Array<(b: InternalSandboxBucket) => boolean> = [
    (b) => b.type === "EVERYDAY",
    (b) => b.type === "BILL" && b.isPriority,
    (b) => b.type === "GOAL" && b.isPriority,
    (b) => b.type === "BILL" && !b.isPriority,
    (b) => b.type === "GOAL" && !b.isPriority && !b.isSurplusTarget,
  ];
  for (const matcher of steps) {
    const demands = buckets
      .map((b, idx) => ({ idx, neededCents: b.neededCents, match: matcher(b) }))
      .filter((d) => d.match && d.neededCents > 0);
    remainingCents = distributeGroup(remainingCents, demands, allocated);
  }
  const surplusSweptCents = remainingCents;
  if (surplusSweptCents > 0) {
    allocated.set(surplusIdx, (allocated.get(surplusIdx) ?? 0) + surplusSweptCents);
  }
  return { allocated, surplusSweptCents };
}

export function simulateSetupPaydaySandbox(input: SandboxSimulationInput): SandboxSimulationResult {
  const regularCycleDays = getCycleDaysFromIncome(input.incomes?.[0]);
  const cycleFactor = computeCycleFactor(regularCycleDays);
  const buckets = buildSandboxBuckets(input, cycleFactor);
  const surplusIdx = resolveSurplusIndex(buckets);
  const { allocated, surplusSweptCents } = executeSandboxWaterfall(input.paycheckAmount, buckets, surplusIdx);

  const lines: SandboxAllocationLine[] = buckets.map((b, idx) => ({
    name: b.name,
    type: b.type,
    allocatedAmount: Number(((allocated.get(idx) ?? 0) / 100).toFixed(2)),
    isSurplusTarget: idx === surplusIdx,
  }));
  const sumByType = (type: "EVERYDAY" | "BILL" | "GOAL") =>
    Number(lines.filter((l) => l.type === type).reduce((s, l) => s + l.allocatedAmount, 0).toFixed(2));

  return {
    regularCycleDays,
    cycleFactor,
    billsAllocated: sumByType("BILL"),
    goalsAllocated: sumByType("GOAL"),
    safeToSpend: sumByType("EVERYDAY"),
    surplusSwept: Number((surplusSweptCents / 100).toFixed(2)),
    surplusTargetName: buckets[surplusIdx]?.name || "Everyday",
    lines,
  };
}
