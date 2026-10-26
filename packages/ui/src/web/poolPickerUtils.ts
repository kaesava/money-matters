import { t } from "@money-matters/i18n";

export interface PoolOption {
  id: string;
  name: string;
  poolType?: "EVERYDAY" | "REGULAR" | "GOAL" | string;
  envelopeType?: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL" | string;
  goalMode?: "TARGET_DATE" | "ONGOING" | string;
  currentBalance?: number | string | null;
  balance?: number | string | null;
  isPrivate?: boolean;
  categories?: Array<{
    id: string;
    name: string;
  }>;
}

export interface PoolPickerProps {
  pools: PoolOption[];
  showBalance: boolean;
  selectedPoolId?: string | null;
  selectedCategoryId?: string | null;
  onChange: (selection: { poolId: string; categoryId: string | null; label: string }) => void;
  allowCategorySelection?: boolean;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export type EnvelopeBadgeKey = "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL";

export interface EnvelopeBadgeInfo {
  label: string;
  tagKey: EnvelopeBadgeKey;
}

export function getEnvelopeBadgeInfo(envelope: {
  envelopeType?: string | null;
  poolType?: string | null;
  type?: string | null;
  goalMode?: string | null;
}): EnvelopeBadgeInfo {
  const rawType = envelope.envelopeType || envelope.poolType || envelope.type || "";

  if (rawType === "EVERYDAY") {
    return { label: t("categories.everydayBadge"), tagKey: "EVERYDAY" };
  }
  if (rawType === "FLEXIBLE_BILL") {
    return { label: t("categories.flexibleBillBadge"), tagKey: "FLEXIBLE_BILL" };
  }
  if (rawType === "SCHEDULED_BILL" || rawType === "REGULAR") {
    return { label: t("categories.scheduledBillBadge"), tagKey: "SCHEDULED_BILL" };
  }
  if (rawType === "ONGOING_GOAL" || envelope.goalMode === "ONGOING") {
    return { label: t("categories.ongoingGoalBadge"), tagKey: "ONGOING_GOAL" };
  }
  if (rawType === "TARGET_GOAL" || rawType === "GOAL" || rawType.includes("GOAL")) {
    return { label: t("categories.targetDateGoalBadge"), tagKey: "TARGET_GOAL" };
  }
  return { label: t("categories.everydayBadge"), tagKey: "EVERYDAY" };
}

export function formatPoolBalance(
  val: number | string | null | undefined,
  currencySymbol = "$",
  locale = "en-AU"
): string | null {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(num)) return null;
  return `${currencySymbol}${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function filterPools(
  regularPools: PoolOption[],
  searchQuery: string,
  allowCategorySelection: boolean
): PoolOption[] {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return regularPools;

  return regularPools.filter((p) => {
    const badge = getEnvelopeBadgeInfo(p);
    const poolMatch = p.name.toLowerCase().includes(q) || badge.label.toLowerCase().includes(q);
    const catMatch = allowCategorySelection && p.categories?.some((c) => c.name.toLowerCase().includes(q));
    return poolMatch || catMatch;
  });
}
