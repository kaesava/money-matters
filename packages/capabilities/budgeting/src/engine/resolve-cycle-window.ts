export interface CycleWindow {
  daysGap: number;
  paychecksPerYear: number;
  cycleFactor: number;
  bufferedCutoffDateStr: string;
  baseNextCutoffTime: number;
}

export function resolveCycleWindow(
  paycheckDate: Date,
  paycheckFrequencyDays: number,
  daysUntilNextIncome?: number,
  nextPaycheckDate?: Date,
  dueBufferDays = 3
): CycleWindow {
  const daysGap = daysUntilNextIncome ?? paycheckFrequencyDays;
  const paychecksPerYear = Math.max(1, Math.round(365 / paycheckFrequencyDays));

  let cycleFactor = (12 * daysGap) / 365;
  if (paycheckFrequencyDays === 14 || daysGap === 14) {
    cycleFactor = 12 / 26;
  } else if (paycheckFrequencyDays === 7 || daysGap === 7) {
    cycleFactor = 12 / 52;
  } else if (paycheckFrequencyDays >= 28 && paycheckFrequencyDays <= 31) {
    cycleFactor = 1.0;
  }

  const baseNextCutoffTime = nextPaycheckDate
    ? nextPaycheckDate.getTime()
    : paycheckDate.getTime() + daysGap * 24 * 60 * 60 * 1000;

  const bufferedCutoffTime = baseNextCutoffTime + dueBufferDays * 24 * 60 * 60 * 1000;
  const bufferedCutoffDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
  }).format(new Date(bufferedCutoffTime));

  return {
    daysGap,
    paychecksPerYear,
    cycleFactor,
    bufferedCutoffDateStr,
    baseNextCutoffTime,
  };
}
