export interface PoolOption {
  id: string;
  name: string;
  poolType?: "EVERYDAY" | "REGULAR" | "GOAL" | string;
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

export const POOL_TYPE_LABELS: Record<string, string> = {
  EVERYDAY: "Everyday Pools",
  REGULAR: "Bills Pools",
  GOAL: "Goals",
  OTHER: "Other Pools",
};

export function formatPoolBalance(val: number | string | null | undefined): string | null {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(num)) return null;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function groupPoolsByType(
  regularPools: PoolOption[],
  searchQuery: string,
  allowCategorySelection: boolean
): Array<{ type: string; label: string; items: PoolOption[] }> {
  const q = searchQuery.toLowerCase().trim();
  const filteredPools = regularPools.filter((p) => {
    if (!q) return true;
    const poolMatch = p.name.toLowerCase().includes(q);
    const catMatch = allowCategorySelection && p.categories?.some((c) => c.name.toLowerCase().includes(q));
    return poolMatch || catMatch;
  });

  const groups: Array<{ type: string; label: string; items: PoolOption[] }> = [
    { type: "EVERYDAY", label: POOL_TYPE_LABELS["EVERYDAY"] || "Everyday", items: [] },
    { type: "REGULAR", label: POOL_TYPE_LABELS["REGULAR"] || "Bills", items: [] },
    { type: "GOAL", label: POOL_TYPE_LABELS["GOAL"] || "Goals", items: [] },
  ];
  const otherItems: PoolOption[] = [];

  for (const pool of filteredPools) {
    if (pool.poolType === "EVERYDAY") {
      groups[0]!.items.push(pool);
    } else if (pool.poolType === "REGULAR") {
      groups[1]!.items.push(pool);
    } else if (pool.poolType === "GOAL") {
      groups[2]!.items.push(pool);
    } else {
      otherItems.push(pool);
    }
  }

  if (otherItems.length > 0) {
    groups.push({ type: "OTHER", label: POOL_TYPE_LABELS["OTHER"] || "Other Pools", items: otherItems });
  }

  return groups.filter((g) => g.items.length > 0);
}
