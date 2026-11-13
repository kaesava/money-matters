import { EnvelopeType, FundingMode } from "@money-matters/types";
import { EngineBucket, BucketType } from "./allocation-engine.js";

export function isBillsBucket(b: { type?: string; envelopeType?: EnvelopeType }): boolean {
  const t = b.type || b.envelopeType;
  return t === "BILL";
}

export function isGoalBucket(b: { type?: string; envelopeType?: EnvelopeType }): boolean {
  const t = b.type || b.envelopeType;
  return t === "GOAL";
}

export function isEverydayBucket(b: { type?: string; envelopeType?: EnvelopeType }): boolean {
  const t = b.type || b.envelopeType;
  return t === "EVERYDAY";
}

export interface RawDbEnvelope {
  id: string;
  name: string;
  envelopeType: EnvelopeType;
  fundingMode?: FundingMode | null;
  isPriority?: boolean | null;
  isSurplusTarget?: boolean | null;
  monthlyAmount?: string | number | null;
  enteredAmount?: string | number | null;
  targetAmount?: string | number | null;
  safetyBufferFloor?: string | number | null;
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

  const fundingMode = env.fundingMode ?? (env.envelopeType === "GOAL" ? "TARGET_BALANCE" : "RECURRING");

  return {
    id: env.id,
    name: env.name,
    type: env.envelopeType as BucketType,
    envelopeType: env.envelopeType,
    fundingMode,
    isPriority: Boolean(env.isPriority),
    isSurplusTarget: Boolean(env.isSurplusTarget),
    monthlyAmount: parseNum(env.monthlyAmount),
    enteredAmount: parseNum(env.enteredAmount),
    targetAmount: parseNum(env.targetAmount),
    safetyBufferFloor: parseNum(env.safetyBufferFloor) ?? 0,
    targetDate: env.endDate || null,
    currentBalance,
    isPrivate: Boolean(env.isPrivate),
    userId: env.userId ?? undefined,
  };
}

