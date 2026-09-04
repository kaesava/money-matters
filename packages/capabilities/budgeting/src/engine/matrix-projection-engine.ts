import { runAllocationEngine, EngineBucket } from "./allocation-engine.js";
export type { EngineBucket };

export interface MatrixIncomeEvent {
  id: string;
  sourceName: string;
  expectedDate: string;
  expectedAmount: number;
  actualAmount: number | null;
  status: "UPCOMING" | "SKIPPED" | "CONFIRMED" | "DRAFT" | "REVIEWED";
  rrule?: string | null;
  userId?: string;
}

export interface ScheduledExpenseEvent {
  categoryId: string;
  amount: number;
  dueDate: string;
  status: "UPCOMING" | "PAID" | "SKIPPED";
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
  
  // Filter for UPCOMING events only to prevent double counting
  const expenseEvents = (input.expenseEvents ?? []).filter((e) => e && e.status === "UPCOMING" && Boolean(e.dueDate) && String(e.dueDate).length >= 10);
  
  // Only project UPCOMING incomes, sort chronologically
  const upcomingIncomes = [...input.incomeEvents]
    .filter((e) => e && e.status === "UPCOMING" && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
    .sort((a, b) => {
      const tA = new Date(a.expectedDate + "T00:00:00").getTime();
      const tB = new Date(b.expectedDate + "T00:00:00").getTime();
      return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
    });

  // Filter categories by Stealth Privacy RLS: (isPrivate = false OR userId = currentUserId)
  const visibleCategories = input.categories.filter(
    (c) => !c.isPrivate || (c.userId && c.userId === input.currentUserId)
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

  // 2. Track running balances: Everyday Pool, Bills Pool, and individual Goals
  let runningEverydayBalance = everydayCats.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  let runningBillsBalance = billsCats.reduce((sum, c) => sum + (c.currentBalance || 0), 0);

  const runningGoalBalances = new Map<string, number>();
  for (const cat of [...goalCats, ...surplusCats]) {
    runningGoalBalances.set(cat.id, cat.currentBalance || 0);
  }

  const everydayCellsMap = new Map<string, MatrixCellData>(); // keyed by incomeEventId
  const billsCellsMap = new Map<string, MatrixCellData>();
  const goalCellsMap = new Map<string, Map<string, MatrixCellData>>(); // categoryId -> (incomeEventId -> MatrixCellData)

  for (const cat of [...goalCats, ...surplusCats]) {
    goalCellsMap.set(cat.id, new Map());
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
      currentBalance: c.type === "EVERYDAY"
        ? runningEverydayBalance
        : c.type === "REGULAR"
        ? runningBillsBalance
        : (runningGoalBalances.get(c.id) ?? 0),
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
    // Note: Since columns can share the exact same date, daysUntilNext might be 0,
    // which means no expenses are deducted between them. This is correct path-dependent behavior!
    const nextColDate = i < columns.length - 1 ? columns[i + 1].date : "9999-12-31";
    
    // A. Everyday Pool Allocation & Balance
    const everydayCalculated = everydayCats.reduce((sum, c) => sum + (columnAllocations.get(c.id) ?? 0), 0);
    const everydayOverrideKey = `${col.id}_pool_everyday`;
    const hasEverydayOverride = typeof cellOverrides[everydayOverrideKey] === "number";
    const finalEverydayAlloc = hasEverydayOverride ? cellOverrides[everydayOverrideKey] : everydayCalculated;

    const everydayCatIds = new Set(everydayCats.map((c) => c.id));
    const relevantEverydayExp = expenseEvents.filter(
      (e) => everydayCatIds.has(e.categoryId) && e.dueDate >= col.date && e.dueDate < nextColDate
    );
    const totalEverydayExp = relevantEverydayExp.reduce((sum, e) => sum + e.amount, 0);

    const startEvBalance = runningEverydayBalance;
    const endEvBalance = startEvBalance + finalEverydayAlloc - totalEverydayExp;
    const minEvBalance = Math.min(startEvBalance + finalEverydayAlloc, endEvBalance);
    runningEverydayBalance = endEvBalance;

    everydayCellsMap.set(col.id, {
      allocated: Number(finalEverydayAlloc.toFixed(2)),
      projectedBalance: Number(endEvBalance.toFixed(2)),
      minProjectedBalance: Number(minEvBalance.toFixed(2)),
      isOverride: hasEverydayOverride,
      hasWarning: minEvBalance < 0,
    });

    // B. Bills Pool Allocation & Balance
    const billsCalculated = billsCats.reduce((sum, c) => sum + (columnAllocations.get(c.id) ?? 0), 0);
    const billsOverrideKey = `${col.id}_pool_bills`;
    const hasBillsOverride = typeof cellOverrides[billsOverrideKey] === "number";
    const finalBillsAlloc = hasBillsOverride ? cellOverrides[billsOverrideKey] : billsCalculated;

    const billsCatIds = new Set(billsCats.map((c) => c.id));
    const relevantBillsExp = expenseEvents.filter(
      (e) => billsCatIds.has(e.categoryId) && e.dueDate >= col.date && e.dueDate < nextColDate
    );
    const totalBillsExp = relevantBillsExp.reduce((sum, e) => sum + e.amount, 0);

    const startBillsBalance = runningBillsBalance;
    const endBillsBalance = startBillsBalance + finalBillsAlloc - totalBillsExp;
    const minBillsBalance = Math.min(startBillsBalance + finalBillsAlloc, endBillsBalance);
    runningBillsBalance = endBillsBalance;

    billsCellsMap.set(col.id, {
      allocated: Number(finalBillsAlloc.toFixed(2)),
      projectedBalance: Number(endBillsBalance.toFixed(2)),
      minProjectedBalance: Number(minBillsBalance.toFixed(2)),
      isOverride: hasBillsOverride,
      hasWarning: minBillsBalance < 0,
    });

    // C. Individual Goals & Surplus Target
    for (const cat of [...goalCats, ...surplusCats]) {
      const overrideKey = `${col.id}_${cat.id}`;
      const hasOverride = typeof cellOverrides[overrideKey] === "number";
      const finalAllocation = hasOverride ? cellOverrides[overrideKey] : (columnAllocations.get(cat.id) ?? 0);

      const startBalance = runningGoalBalances.get(cat.id) ?? 0;
      const balanceAfterAlloc = startBalance + finalAllocation;

      const relevantExpenses = expenseEvents.filter(
        (e) => e.categoryId === cat.id && e.dueDate >= col.date && e.dueDate < nextColDate
      );
      const totalExpenses = relevantExpenses.reduce((sum, e) => sum + e.amount, 0);

      const endBalance = balanceAfterAlloc - totalExpenses;
      const minProjectedBalance = Math.min(balanceAfterAlloc, endBalance);

      runningGoalBalances.set(cat.id, endBalance);

      const cellMap = goalCellsMap.get(cat.id)!;
      cellMap.set(col.id, {
        allocated: Number(finalAllocation.toFixed(2)),
        projectedBalance: Number(endBalance.toFixed(2)),
        minProjectedBalance: Number(minProjectedBalance.toFixed(2)),
        isOverride: hasOverride,
        hasWarning: minProjectedBalance < 0,
      });
    }
  }

  // 4. Structure into 4 Clean Accordion Row Groups (Everyday & Bills at Pool Level)
  const everydayCellsRecord: Record<string, MatrixCellData> = {};
  const billsCellsRecord: Record<string, MatrixCellData> = {};
  for (const col of columns) {
    everydayCellsRecord[col.id] = everydayCellsMap.get(col.id)!;
    billsCellsRecord[col.id] = billsCellsMap.get(col.id)!;
  }

  const everydayRows: MatrixRow[] = [
    {
      categoryId: "pool_everyday",
      categoryName: "🛍️ Everyday Pool (Discretionary)",
      type: "EVERYDAY",
      isPrivate: false,
      isPoolRow: true,
      cells: everydayCellsRecord,
    },
  ];

  const billsRows: MatrixRow[] = [
    {
      categoryId: "pool_bills",
      categoryName: "💳 Bills Pool (Fixed Obligations)",
      type: "REGULAR",
      isPrivate: false,
      isPoolRow: true,
      cells: billsCellsRecord,
    },
  ];

  const goalsRows: MatrixRow[] = goalCats.map((cat) => {
    const rowCells: Record<string, MatrixCellData> = {};
    const cellMap = goalCellsMap.get(cat.id)!;
    for (const col of columns) {
      rowCells[col.id] = cellMap.get(col.id)!;
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      type: cat.type,
      isPrivate: cat.isPrivate ?? false,
      isSurplusTarget: cat.isSurplusTarget,
      isPoolRow: false,
      cells: rowCells,
    };
  });

  const surplusRows: MatrixRow[] = surplusCats.map((cat) => {
    const rowCells: Record<string, MatrixCellData> = {};
    const cellMap = goalCellsMap.get(cat.id)!;
    for (const col of columns) {
      rowCells[col.id] = cellMap.get(col.id)!;
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      type: cat.type,
      isPrivate: cat.isPrivate ?? false,
      isSurplusTarget: cat.isSurplusTarget,
      isPoolRow: false,
      cells: rowCells,
    };
  });

  const groups: MatrixAccordionGroup[] = [
    {
      id: "everyday",
      title: "🛍️ Everyday Pool",
      rows: everydayRows,
    },
    {
      id: "bills",
      title: "💳 Bills & Obligations Pool",
      rows: billsRows,
    },
    {
      id: "goals",
      title: "🎯 Savings Goals & Lumpy Expenses",
      rows: goalsRows,
    },
    {
      id: "surplus",
      title: "🏦 Surplus Accumulator Pool",
      rows: surplusRows,
    },
  ];

  return {
    columns,
    groups,
  };
}
