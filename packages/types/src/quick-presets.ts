export interface QuickPresetItem {
  name: string;
  amount?: string;
  categoryId?: string;
  sourceCategoryId?: string;
  destinationCategoryId?: string;
  receivingAccountId?: string;
  displayName?: string;
}

export function isPaydayOrAdjustment(note?: string | null): boolean {
  if (!note) return false;
  const lower = note.toLowerCase();
  return (
    lower.includes("payday") ||
    lower.includes("waterfall") ||
    lower.includes("adjustment") ||
    lower.includes("pool balance") ||
    lower.includes("reconcil")
  );
}

export function computeRecentAndFrequentPresets<T>(
  items: T[],
  getKey: (item: T) => string | null,
  buildPreset: (item: T) => QuickPresetItem,
  getTimestamp?: (item: T) => number
): { recent: QuickPresetItem[]; frequent: QuickPresetItem[] } {
  const recent: QuickPresetItem[] = [];
  const recentKeys = new Set<string>();
  const freqCounts = new Map<string, { count: number; sample: T }>();
  const cutoffTime = Date.now() - 180 * 24 * 60 * 60 * 1000;

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;

    if (recent.length < 2 && !recentKeys.has(key)) {
      recentKeys.add(key);
      recent.push(buildPreset(item));
    }

    const itemTime = getTimestamp ? getTimestamp(item) : Date.now();
    if (itemTime >= cutoffTime) {
      const existing = freqCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        freqCounts.set(key, { count: 1, sample: item });
      }
    }
  }

  const frequent = Array.from(freqCounts.entries())
    .filter(([key]) => !recentKeys.has(key))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 2)
    .map(([_, entry]) => buildPreset(entry.sample));

  return { recent, frequent };
}
