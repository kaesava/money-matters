/**
 * Pure payday split draft calculation helpers shared across Web and Mobile.
 */

export function sanitizeDecimalInput(val: string, maxIntDigits = 12): string {
  let cleaned = val.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
  if (parts[0].length > maxIntDigits) {
    parts[0] = parts[0].slice(0, maxIntDigits);
    cleaned = parts[1] !== undefined ? `${parts[0]}.${parts[1]}` : parts[0];
  }
  if (parts[1] && parts[1].length > 2) cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
  return cleaned;
}

export interface PaydayAllocationSummary {
  nonSweepAllocatedSum: number;
  sweepPoolRemainder: number;
  isDeficit: boolean;
  everydayAllocated: number;
  billsAllocated: number;
  goalsAllocated: number;
}

export function computePaydayAllocationSummary(
  numericActual: number,
  sweepPoolId: string | undefined,
  lines: ReadonlyArray<{ bucketId: string; proposedAmount: number; envelopeType?: string }>,
  linesMap: Record<string, string>
): PaydayAllocationSummary {
  const nonSweepAllocatedSum = sweepPoolId
    ? Object.entries(linesMap).reduce(
        (acc, [bId, valStr]) => (bId === sweepPoolId ? acc : acc + (parseFloat(valStr) || 0)),
        0
      )
    : 0;

  const roundedRemainder = Math.round((numericActual - nonSweepAllocatedSum) * 100) / 100;
  const sweepPoolRemainder =
    Object.is(roundedRemainder, -0) || Math.abs(roundedRemainder) < 0.005
      ? 0
      : Math.max(-999999, roundedRemainder);

  const sumByType = (targetType: string) =>
    lines
      .filter((l) => l.envelopeType === targetType)
      .reduce((sum, l) => {
        const val =
          l.bucketId === sweepPoolId && targetType === "EVERYDAY"
            ? Math.max(0, sweepPoolRemainder)
            : parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0;
        return sum + val;
      }, 0);

  return {
    nonSweepAllocatedSum,
    sweepPoolRemainder,
    isDeficit: sweepPoolRemainder < -0.01,
    everydayAllocated: sumByType("EVERYDAY"),
    billsAllocated: sumByType("BILL"),
    goalsAllocated: sumByType("GOAL"),
  };
}
