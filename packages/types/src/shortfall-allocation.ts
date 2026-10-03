export interface ShortfallValidationResult {
  isValid: boolean;
  shortfallAmount: number;
  totalAllocated: number;
  difference: number;
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
  hasShortfall: boolean;
}

/**
 * Calculates the shortfall amount between the expected expense amount and the pool's balance.
 */
export function calculateShortfall(targetAmount: number, poolBalance: number): number {
  if (isNaN(targetAmount) || targetAmount <= 0) return 0;
  const balance = isNaN(poolBalance) ? 0 : poolBalance;
  return Math.max(0, Math.round((targetAmount - balance) * 100) / 100);
}

/**
 * Calculates the total amount allocated across all funding pools.
 */
export function calculateTotalAllocated(allocations: Record<string, string | number>): number {
  let sum = 0;
  for (const val of Object.values(allocations)) {
    const num = typeof val === 'number' ? val : parseFloat(String(val || '0'));
    if (!isNaN(num) && num > 0) {
      sum += num;
    }
  }
  return Math.round(sum * 100) / 100;
}

/**
 * Validates shortfall allocations. Allocations must cover the shortfall and cannot exceed it.
 */
export function validateShortfallAllocations(
  shortfallAmount: number,
  allocations: Record<string, string | number>
): ShortfallValidationResult {
  const roundedShortfall = Math.round(Math.max(0, shortfallAmount) * 100) / 100;
  const hasShortfall = roundedShortfall > 0.001;
  const totalAllocated = calculateTotalAllocated(allocations);
  const difference = Math.round((totalAllocated - roundedShortfall) * 100) / 100;

  if (!hasShortfall) {
    return {
      isValid: true,
      shortfallAmount: 0,
      totalAllocated: 0,
      difference: 0,
      isOverAllocated: false,
      isUnderAllocated: false,
      hasShortfall: false,
    };
  }

  const isOverAllocated = difference > 0.001;
  const isUnderAllocated = difference < -0.001;
  const isValid = !isOverAllocated && !isUnderAllocated;

  return {
    isValid,
    shortfallAmount: roundedShortfall,
    totalAllocated,
    difference: Math.abs(difference),
    isOverAllocated,
    isUnderAllocated,
    hasShortfall,
  };
}
