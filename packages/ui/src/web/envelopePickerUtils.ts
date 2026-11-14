import { t } from "@money-matters/i18n";

export interface PoolOption {
  id: string;
  name: string;
  poolType?: "EVERYDAY" | "BILL" | "GOAL" | string;
  envelopeType?: "EVERYDAY" | "BILL" | "GOAL" | string;
  fundingMode?: "TARGET_BALANCE" | "RECURRING" | string;
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

export type EnvelopeBadgeKey = "EVERYDAY" | "BILL" | "GOAL";

export interface EnvelopeBadgeInfo {
  label: string;
  tagKey: EnvelopeBadgeKey;
}

export function getEnvelopeBadgeInfo(envelope: {
  envelopeType?: string | null;
  fundingMode?: string | null;
  poolType?: string | null;
  type?: string | null;
}): EnvelopeBadgeInfo {
  const rawType = envelope.envelopeType || envelope.poolType || envelope.type || "";
  const fundingMode = envelope.fundingMode;

  if (rawType === "EVERYDAY") {
    return { label: t("categories.everydayBadge"), tagKey: "EVERYDAY" };
  }
  if (rawType === "BILL") {
    const isTargetBalance = fundingMode === "TARGET_BALANCE";
    return {
      label: isTargetBalance ? t("categories.targetBalanceBadge") : t("categories.recurringBadge"),
      tagKey: "BILL",
    };
  }
  if (rawType === "GOAL") {
    const isRecurring = fundingMode === "RECURRING";
    return {
      label: isRecurring ? t("categories.recurringBadge") : t("categories.targetBalanceBadge"),
      tagKey: "GOAL",
    };
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
