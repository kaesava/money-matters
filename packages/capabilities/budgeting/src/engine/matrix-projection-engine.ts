import { runAllocationEngine, EngineBucket } from "./allocation-engine.js";
export type { EngineBucket };

export interface MatrixIncomeEvent {
  id: string;
  sourceName: string;
  expectedDate: string;
  expectedAmount: number;
  actualAmount: number | null;
  status: "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED";
  rrule?: string | null;
  userId?: string;
  isPrivate?: boolean;
}

export interface ScheduledExpenseEvent {
  categoryId: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "CONFIRMED";
}

export interface MatrixCellData {
  allocated: number;
  projectedBalance: number;
  minProjectedBalance: number;
  isOverride: boolean;
  hasWarning: boolean;
}

export interface MatrixRow {
  categoryId: string;
  categoryName: string;
  type: string;
  isPrivate: boolean;
  isSurplusTarget?: boolean;
  isPoolRow?: boolean;
  cells: Record<string, MatrixCellData>;
}

export interface MatrixAccordionGroup {
  id: "income" | "everyday" | "bills" | "goals" | "surplus";
  title: string;
  rows: MatrixRow[];
}

export interface MatrixColumn {
  id: string; // The incomeEventId
  date: string; // YYYY-MM-DD
  dateLabel: string;
  totalIncome: number;
  sourceName: string;
  hiddenAllocationsTotal: number; // Opaque stealth privacy total for partner view
}

export interface MatrixProjectionInput {
  currentUserId: string;
  categories: EngineBucket[];
  incomeEvents: MatrixIncomeEvent[];
  expenseEvents?: ScheduledExpenseEvent[];
  cellOverrides?: Record<string, number>; // `${incomeEventId}_${categoryId}` -> value
  monthsAhead?: number;
}

export interface MatrixProjectionOutput {
  columns: MatrixColumn[];
  groups: MatrixAccordionGroup[];
}

export function computeMatrixProjection(input: MatrixProjectionInput): MatrixProjectionOutput {
  const cellOverrides = input.cellOverrides ?? {};
  
  // Filter for PENDING events only to prevent double counting
  const expenseEvents = (input.expenseEvents ?? []).filter((e) => e && e.status === "PENDING" && Boolean(e.dueDate) && String(e.dueDate).length >= 10);
  
  // Only project PENDING incomes, sort chronologically
  const upcomingIncomes = [...input.incomeEvents]
    .filter((e) => e && e.status === "PENDING" && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
    .sort((a, b) => {
      const tA = new Date(a.expectedDate + "T00:00:00").getTime();
      const tB = new Date(b.expectedDate + "T00:00:00").getTime();
      return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
    });

  // Filter categories by Stealth Privacy RLS: (isPrivate = false OR !c.userId OR c.userId === input.currentUserId)
  const visibleCategories = input.categories.filter(
    (c) => !c.isPrivate || !c.userId || (c.userId && c.userId === input.currentUserId)
  );
  const hiddenCategories = input.categories.filter(
    (c) => c.isPrivate && c.userId && c.userId !== input.currentUserId
  );

  // Separate Pool Categories vs Individual Goal Categories
  const everydayCats = visibleCategories.filter((c) => c.type === "EVERYDAY");
  const billsCats = visibleCategories.filter((c) => c.type === "REGULAR");
  const goalCats = visibleCategories.filter((c) => c.type === "GOAL" && !c.isSurplusTarget);
  const surplusCats = visibleCategories.filter((c) => c.isSurplusTarget);

  // 1. Build Columns metadata (1:1 with Income Events)
  const columns: MatrixColumn[] = [];
  for (const evt of upcomingIncomes) {
    let dateLabel = evt.expectedDate;
    try {
      const dateObj = new Date(evt.expectedDate + "T00:00:00");
      if (!isNaN(dateObj.getTime())) {
        dateLabel = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" }).format(dateObj);
      }
    } catch (_err) {
      // Keep dateLabel as raw expectedDate fallback
    }

    columns.push({
      id: evt.id,
      date: evt.expectedDate,
      dateLabel,
      totalIncome: evt.actualAmount ?? evt.expectedAmount,
      sourceName: evt.sourceName,
      hiddenAllocationsTotal: 0,
    });
  }

  // 2. Track running balances per pool category
  const runningPoolBalances = new Map<string, number>();
  const poolCellsMap = new Map<string, Map<string, MatrixCellData>>(); // categoryId -> (incomeEventId -> MatrixCellData)

  for (const cat of visibleCategories) {
    runningPoolBalances.set(cat.id, cat.currentBalance || 0);
    poolCellsMap.set(cat.id, new Map());
  }

  // 3. Sequential timeline simulation
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const evt = upcomingIncomes[i];

    // Determine frequency days from rrule if available, default to 14
    let freqDays = 14;
    if (evt.rrule) {
      const upper = evt.rrule.toUpperCase();
      if (upper.includes("FREQ=MONTHLY")) freqDays = 30;
      else if (upper.includes("FREQ=WEEKLY") && !upper.includes("INTERVAL=2")) freqDays = 7;
      else if (upper.includes("FREQ=YEARLY")) freqDays = 365;
    }

    let daysUntilNext = 30;
    if (i < columns.length - 1) {
      const nextDateObj = new Date(columns[i + 1].date + "T00:00:00");
      const currDateObj = new Date(col.date + "T00:00:00");
      daysUntilNext = Math.max(1, Math.round((nextDateObj.getTime() - currDateObj.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const columnAllocations = new Map<string, number>();
    let hiddenTotalForColumn = 0;

    const currentBuckets: EngineBucket[] = input.categories.map((c) => ({
      ...c,
      currentBalance: runningPoolBalances.get(c.id) ?? (c.currentBalance || 0),
    }));

    const waterfallResult = runAllocationEngine({
      incomeAmount: col.totalIncome,
      buckets: currentBuckets,
      paycheckDate: new Date(col.date + "T00:00:00"),
      paycheckFrequencyDays: freqDays,
      daysUntilNextIncome: daysUntilNext,
    });

    for (const line of waterfallResult.lines) {
      const cat = input.categories.find((c) => c.id === line.bucketId);
      if (cat && hiddenCategories.some((h) => h.id === cat.id)) {
        hiddenTotalForColumn += line.proposedAmount;
      } else {
        const curr = columnAllocations.get(line.bucketId) ?? 0;
        columnAllocations.set(line.bucketId, curr + line.proposedAmount);
      }
    }

    col.hiddenAllocationsTotal = Number(hiddenTotalForColumn.toFixed(2));

    // Calculate expense deductions up until the next payday date
    const nextColDate = i < columns.length - 1 ? columns[i + 1].date : "9999-12-31";

    for (const cat of visibleCategories) {
      const overrideKey = `${col.id}_${cat.id}`;
      const hasDirectOverride = typeof cellOverrides[overrideKey] === "number";
      const fallbackKey =
        cat.type === "EVERYDAY" ? `${col.id}_pool_everyday` : cat.type === "REGULAR" ? `${col.id}_pool_bills` : null;
      const hasFallbackOverride = fallbackKey ? typeof cellOverrides[fallbackKey] === "number" : false;

      const hasOverride = hasDirectOverride || hasFallbackOverride;
      const finalAllocation = hasDirectOverride
        ? cellOverrides[overrideKey]
        : hasFallbackOverride && fallbackKey
        ? cellOverrides[fallbackKey]
        : (columnAllocations.get(cat.id) ?? 0);

      const startBalance = runningPoolBalances.get(cat.id) ?? 0;
      const balanceAfterAlloc = startBalance + finalAllocation;

      const relevantExpenses = expenseEvents.filter(
        (e) =>
          (e.categoryId === cat.id || (e as unknown as { poolId?: string }).poolId === cat.id) &&
          (i === 0 ? e.dueDate < nextColDate : (e.dueDate >= col.date && e.dueDate < nextColDate))
      );
      const totalExpenses = relevantExpenses.reduce((sum, e) => sum + e.amount, 0);

      const endBalance = balanceAfterAlloc - totalExpenses;
      const minProjectedBalance = Math.min(balanceAfterAlloc, endBalance);

      runningPoolBalances.set(cat.id, endBalance);

      const cellMap = poolCellsMap.get(cat.id)!;
      cellMap.set(col.id, {
        allocated: Number(finalAllocation.toFixed(2)),
        projectedBalance: Number(endBalance.toFixed(2)),
        minProjectedBalance: Number(minProjectedBalance.toFixed(2)),
        isOverride: hasOverride,
        hasWarning: minProjectedBalance < 0,
      });
    }
  }

  // 4. Structure into 4 Clean Accordion Row Groups by Pool Type
  const buildRowsForCats = (cats: EngineBucket[], isPoolRow: boolean): MatrixRow[] => {
    return cats.map((cat) => {
      const rowCells: Record<string, MatrixCellData> = {};
      const cellMap = poolCellsMap.get(cat.id)!;
      for (const col of columns) {
        rowCells[col.id] = cellMap.get(col.id)!;
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        type: cat.type,
        isPrivate: cat.isPrivate ?? false,
        isSurplusTarget: cat.isSurplusTarget,
        isPoolRow,
        cells: rowCells,
      };
    });
  };

  const everydayRows = buildRowsForCats(everydayCats, true);
  const billsRows = buildRowsForCats(billsCats, true);
  const goalsRows = buildRowsForCats(goalCats, false);
  const surplusRows = buildRowsForCats(surplusCats, false);

  const groups: MatrixAccordionGroup[] = [
    {
      id: "everyday",
      title: "Everyday Pools",
      rows: everydayRows,
    },
    {
      id: "bills",
      title: "Bills Pools",
      rows: billsRows,
    },
    {
      id: "goals",
      title: "Goals",
      rows: goalsRows,
    },
    {
      id: "surplus",
      title: "Surplus",
      rows: surplusRows,
    },
  ];

  return {
    columns,
    groups,
  };
}

export interface BaseIncomeItem {
  id: string;
  expectedDate: string;
  status?: string;
}

/**
 * Returns the ID of the earliest pending income event (sorted chronologically by expectedDate).
 * A pending income event is one that is not confirmed/processed (status !== "CONFIRMED").
 */
export function getEarliestPendingIncomeId<T extends BaseIncomeItem>(incomeItems: T[]): string | null {
  if (!incomeItems || incomeItems.length === 0) return null;
  const pending = incomeItems.filter((item) => {
    if (item.status === "CONFIRMED") return false;
    return true;
  });
  if (pending.length === 0) return null;
  const sorted = [...pending].sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
  return sorted[0].id;
}

