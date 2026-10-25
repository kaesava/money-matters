export function toCents(amount: number): number {
  return Math.round((amount || 0) * 100);
}

export function toDollars(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function calculateCycleFactor(regularCycleDays: number, isIrregular: boolean): number {
  if (!isIrregular) {
    if (regularCycleDays === 14) return 12 / 26;
    if (regularCycleDays === 7) return 12 / 52;
    if (regularCycleDays >= 28 && regularCycleDays <= 31) return 1.0;
  }
  return (12 * regularCycleDays) / 365;
}
