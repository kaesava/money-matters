import { EngineBucket } from "./allocation-engine.js";
import {
  runCumulativeProjection,
  CumulativeProjectionIncomeEvent,
  CumulativeProjectionExpenseEvent,
} from "./cumulative-projection.js";
import { isBillsBucket, isGoalBucket, isEverydayBucket } from "./envelope-engine-mapper.js";

export type { EngineBucket };

export interface MatrixIncomeEvent extends CumulativeProjectionIncomeEvent {
  sourceName: string;
}

export type ScheduledExpenseEvent = CumulativeProjectionExpenseEvent & {
  categoryId: string;
};

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
  timezone?: string;
  locale?: string;
}

export interface MatrixProjectionOutput {
  columns: MatrixColumn[];
  groups: MatrixAccordionGroup[];
}

export function computeMatrixProjection(input: MatrixProjectionInput): MatrixProjectionOutput {
  // Filter categories by Stealth Privacy RLS: (isPrivate = false OR !c.userId OR c.userId === input.currentUserId)
  const visibleCategories = input.categories.filter(
    (c) => !c.isPrivate || !c.userId || (c.userId && c.userId === input.currentUserId)
  );
  const hiddenCategories = input.categories.filter(
    (c) => c.isPrivate && c.userId && c.userId !== input.currentUserId
  );

  const everydayCats = visibleCategories.filter(isEverydayBucket);
  const billsCats = visibleCategories.filter(isBillsBucket);
  const goalCats = visibleCategories.filter((c) => isGoalBucket(c) && !c.isSurplusTarget);
  const surplusCats = visibleCategories.filter((c) => c.isSurplusTarget);

  const projectionResult = runCumulativeProjection({
    categories: input.categories,
    incomeEvents: input.incomeEvents,
    expenseEvents: input.expenseEvents,
    cellOverrides: input.cellOverrides,
    currentUserId: input.currentUserId,
    timezone: input.timezone,
  });

  const columns: MatrixColumn[] = [];
  const poolCellsMap = new Map<string, Map<string, MatrixCellData>>();

  for (const cat of visibleCategories) {
    poolCellsMap.set(cat.id, new Map());
  }

  const tz = input.timezone || "UTC";
  const loc = input.locale && input.locale !== "auto" ? input.locale : "en-AU";

  for (const step of projectionResult.steps) {
    const evt = step.incomeEvent;
    let dateLabel = step.date;
    try {
      const dateObj = new Date(step.date + "T00:00:00");
      if (!isNaN(dateObj.getTime())) {
        dateLabel = new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", timeZone: tz }).format(dateObj);
      }
    } catch (_err) {
      // Keep fallback
    }

    let hiddenTotalForColumn = 0;
    for (const hCat of hiddenCategories) {
      const alloc = step.allocations.get(hCat.id)?.proposedAmount ?? 0;
      hiddenTotalForColumn += alloc;
    }

    columns.push({
      id: evt.id,
      date: step.date,
      dateLabel,
      totalIncome: step.totalIncome,
      sourceName: evt.sourceName ?? evt.name ?? "Paycheck",
      hiddenAllocationsTotal: Number(hiddenTotalForColumn.toFixed(2)),
    });

    for (const cat of visibleCategories) {
      const allocDetail = step.allocations.get(cat.id);
      const allocated = allocDetail?.proposedAmount ?? 0;
      const endBalance = step.balancesAfterExpenses.get(cat.id) ?? 0;
      const minProjectedBalance = step.minProjectedBalances.get(cat.id) ?? 0;

      const cellMap = poolCellsMap.get(cat.id)!;
      cellMap.set(evt.id, {
        allocated: Number(allocated.toFixed(2)),
        projectedBalance: Number(endBalance.toFixed(2)),
        minProjectedBalance: Number(minProjectedBalance.toFixed(2)),
        isOverride: allocDetail?.isOverride ?? false,
        hasWarning: minProjectedBalance < 0,
      });
    }
  }

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

  const groups: MatrixAccordionGroup[] = [
    { id: "everyday", title: "Everyday Envelopes", rows: buildRowsForCats(everydayCats, true) },
    { id: "bills", title: "Bills Envelopes", rows: buildRowsForCats(billsCats, true) },
    { id: "goals", title: "Goals", rows: buildRowsForCats(goalCats, false) },
    { id: "surplus", title: "Surplus", rows: buildRowsForCats(surplusCats, false) },
  ];

  return { columns, groups };
}

export interface BaseIncomeItem {
  id: string;
  expectedDate: string;
  status?: string;
}

export function getEarliestPendingIncomeId<T extends BaseIncomeItem>(incomeItems: T[]): string | null {
  if (!incomeItems || incomeItems.length === 0) return null;
  const pending = incomeItems.filter((item) => item.status !== "CONFIRMED");
  if (pending.length === 0) return null;
  const sorted = [...pending].sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
  return sorted[0].id;
}
