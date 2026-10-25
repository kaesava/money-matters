import { EnvelopeType } from "@money-matters/types";
import { EngineBucket, BucketType } from "./allocation-engine.js";

export function isBillsBucket(b: { type?: string; envelopeType?: EnvelopeType }): boolean {
  const t = b.type || b.envelopeType;
  return t === "SCHEDULED_BILL" || t === "FLEXIBLE_BILL" || t === "REGULAR";
}

export function isGoalBucket(b: { type?: string; envelopeType?: EnvelopeType }): boolean {
  const t = b.type || b.envelopeType;
  return t === "TARGET_GOAL" || t === "ONGOING_GOAL" || t === "GOAL";
}

export function isEverydayBucket(b: { type?: string; envelopeType?: EnvelopeType }): boolean {
  const t = b.type || b.envelopeType;
  return t === "EVERYDAY";
}

export interface RawDbEnvelope {
  id: string;
  name: string;
  envelopeType: EnvelopeType;
  isEssential?: boolean | null;
  isCommitted?: boolean | null;
  isSurplusTarget?: boolean | null;
  monthlyAmount?: string | number | null;
  targetAmount?: string | number | null;
  safetyBufferFloor?: string | number | null;
  goalMode?: "TARGET_DATE" | "ONGOING" | null;
  endDate?: string | null;
  isPrivate?: boolean | null;
  userId?: string | null;
}

export function mapEnvelopeToEngineBucket(env: RawDbEnvelope, currentBalance: number = 0): EngineBucket {
  const parseNum = (val: string | number | null | undefined): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const n = typeof val === "number" ? val : parseFloat(val);
    return isNaN(n) ? null : n;
  };

  const defaultGoalMode = env.envelopeType === "TARGET_GOAL" ? "TARGET_DATE" : "ONGOING";

  return {
    id: env.id,
    name: env.name,
    type: env.envelopeType as BucketType,
    envelopeType: env.envelopeType,
    isEssential: Boolean(env.isEssential),
    isCommitted: Boolean(env.isCommitted),
    isSurplusTarget: Boolean(env.isSurplusTarget),
    monthlyAmount: parseNum(env.monthlyAmount),
    targetAmount: parseNum(env.targetAmount),
    safetyBufferFloor: parseNum(env.safetyBufferFloor) ?? 0,
    goalMode: env.goalMode ?? defaultGoalMode,
    targetDate: env.endDate || null,
    currentBalance,
    isPrivate: Boolean(env.isPrivate),
    userId: env.userId ?? undefined,
  };
}
