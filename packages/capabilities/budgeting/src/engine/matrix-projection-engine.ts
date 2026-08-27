import { runAllocationEngine, EngineBucket } from "./allocation-engine.js";
import { generateBurstDates } from "./burst-engine.js";

export interface MatrixIncomeSource {
  id: string;
  name: string;
  amount: number;
  rrule: string;
  startDate: string;
  receivingAccountId?: string | null;
  userId?: string;
}

export interface ScheduledExpenseEvent {
  categoryId: string;
  amount: number;
  dueDate: string;
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
  date: string; // YYYY-MM-DD
  dateLabel: string;
  totalIncome: number;
  incomeBreakdown: Array<{ id: string; name: string; amount: number }>;
  hiddenAllocationsTotal: number; // Opaque stealth privacy total for partner view
}

export interface MatrixProjectionInput {
  currentUserId: string;
  categories: EngineBucket[];
  incomeSources: MatrixIncomeSource[];
  expenseEvents?: ScheduledExpenseEvent[];
  cellOverrides?: Record<string, number>; // `${columnDate}_${categoryId}` -> value
  monthsAhead?: number;
}

export interface MatrixProjectionOutput {
  columns: MatrixColumn[];
  groups: MatrixAccordionGroup[];
}

export function computeMatrixProjection(input: MatrixProjectionInput): MatrixProjectionOutput {
  const monthsAhead = input.monthsAhead ?? 12;
  const cellOverrides = input.cellOverrides ?? {};
  const expenseEvents = input.expenseEvents ?? [];

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

  // 1. Generate chronological payday events across all income sources for next N months
  interface PaydayEvent {
    date: Date;
    dateStr: string;
    sourceId: string;
    sourceName: string;
    amount: number;
    frequencyDays: number;
    userId?: string;
  }

  const allPaydays: PaydayEvent[] = [];

  for (const src of input.incomeSources) {
    const dates = generateBurstDates(src.rrule, src.startDate, null, monthsAhead);
    
    let freqDays = 14;
    if (src.rrule.includes("FREQ=WEEKLY")) {
      freqDays = src.rrule.includes("INTERVAL=2") ? 14 : 7;
    } else if (src.rrule.includes("FREQ=MONTHLY")) {
      freqDays = 30;
    }

    for (const d of dates) {
      const dateStr = d.toISOString().split("T")[0];
      allPaydays.push({
        date: d,
        dateStr,
        sourceId: src.id,
        sourceName: src.name,
        amount: src.amount,
        frequencyDays: freqDays,
        userId: src.userId,
      });
    }
  }

  allPaydays.sort((a, b) => a.date.getTime() - b.date.getTime());

  const columnsMap = new Map<string, PaydayEvent[]>();
  for (const p of allPaydays) {
    const existing = columnsMap.get(p.dateStr) || [];
    existing.push(p);
    columnsMap.set(p.dateStr, existing);
  }

  const columnDates = Array.from(columnsMap.keys()).sort();

  // 2. Build Columns metadata
  const columns: MatrixColumn[] = [];
  for (const dateStr of columnDates) {
    const events = columnsMap.get(dateStr)!;
    const totalIncome = events.reduce((sum, e) => sum + e.amount, 0);
    const dateObj = new Date(dateStr + "T00:00:00");
    const dateLabel = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" }).format(dateObj);

    columns.push({
      date: dateStr,
      dateLabel,
      totalIncome,
      incomeBreakdown: events.map((e) => ({ id: e.sourceId, name: e.sourceName, amount: e.amount })),
      hiddenAllocationsTotal: 0,
    });
  }

  // 3. Track running balances: Everyday Pool, Bills Pool, and individual Goals
  let runningEverydayBalance = everydayCats.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  let runningBillsBalance = billsCats.reduce((sum, c) => sum + (c.currentBalance || 0), 0);

  const runningGoalBalances = new Map<string, number>();
  for (const cat of [...goalCats, ...surplusCats]) {
    runningGoalBalances.set(cat.id, cat.currentBalance || 0);
  }

  const everydayCellsMap = new Map<string, MatrixCellData>();
  const billsCellsMap = new Map<string, MatrixCellData>();
  const goalCellsMap = new Map<string, Map<string, MatrixCellData>>(); // categoryId -> (dateStr -> MatrixCellData)

  for (const cat of [...goalCats, ...surplusCats]) {
    goalCellsMap.set(cat.id, new Map());
  }

  // 4. Sequential timeline simulation
  for (let i = 0; i < columnDates.length; i++) {
    const colDate = columnDates[i];
    const col = columns[i];
    const eventsOnDate = columnsMap.get(colDate)!;

    let daysUntilNext = 30;
    if (i < columnDates.length - 1) {
      const nextDateObj = new Date(columnDates[i + 1] + "T00:00:00");
      const currDateObj = new Date(colDate + "T00:00:00");
      daysUntilNext = Math.max(1, Math.round((nextDateObj.getTime() - currDateObj.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const columnAllocations = new Map<string, number>();
    let hiddenTotalForColumn = 0;

    for (const evt of eventsOnDate) {
      const currentBuckets: EngineBucket[] = input.categories.map((c) => ({
        ...c,
        currentBalance: c.type === "EVERYDAY"
          ? runningEverydayBalance
          : c.type === "REGULAR"
          ? runningBillsBalance
          : (runningGoalBalances.get(c.id) ?? 0),
      }));

      const waterfallResult = runAllocationEngine({
        incomeAmount: evt.amount,
        buckets: currentBuckets,
        paycheckDate: evt.date,
        paycheckFrequencyDays: evt.frequencyDays,
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
    }

    col.hiddenAllocationsTotal = Number(hiddenTotalForColumn.toFixed(2));

    // A. Everyday Pool Allocation & Balance
    const everydayCalculated = everydayCats.reduce((sum, c) => sum + (columnAllocations.get(c.id) ?? 0), 0);
    const everydayOverrideKey = `${colDate}_pool_everyday`;
    const hasEverydayOverride = typeof cellOverrides[everydayOverrideKey] === "number";
    const finalEverydayAlloc = hasEverydayOverride ? cellOverrides[everydayOverrideKey] : everydayCalculated;

    const nextColDate = i < columnDates.length - 1 ? columnDates[i + 1] : "9999-12-31";
    const everydayCatIds = new Set(everydayCats.map((c) => c.id));
    const relevantEverydayExp = expenseEvents.filter(
      (e) => everydayCatIds.has(e.categoryId) && e.dueDate >= colDate && e.dueDate < nextColDate
    );
    const totalEverydayExp = relevantEverydayExp.reduce((sum, e) => sum + e.amount, 0);

    const startEvBalance = runningEverydayBalance;
    const endEvBalance = startEvBalance + finalEverydayAlloc - totalEverydayExp;
    const minEvBalance = Math.min(startEvBalance + finalEverydayAlloc, endEvBalance);
    runningEverydayBalance = endEvBalance;

    everydayCellsMap.set(colDate, {
      allocated: Number(finalEverydayAlloc.toFixed(2)),
      projectedBalance: Number(endEvBalance.toFixed(2)),
      minProjectedBalance: Number(minEvBalance.toFixed(2)),
      isOverride: hasEverydayOverride,
      hasWarning: minEvBalance < 0,
    });

    // B. Bills Pool Allocation & Balance
    const billsCalculated = billsCats.reduce((sum, c) => sum + (columnAllocations.get(c.id) ?? 0), 0);
    const billsOverrideKey = `${colDate}_pool_bills`;
    const hasBillsOverride = typeof cellOverrides[billsOverrideKey] === "number";
    const finalBillsAlloc = hasBillsOverride ? cellOverrides[billsOverrideKey] : billsCalculated;

    const billsCatIds = new Set(billsCats.map((c) => c.id));
    const relevantBillsExp = expenseEvents.filter(
      (e) => billsCatIds.has(e.categoryId) && e.dueDate >= colDate && e.dueDate < nextColDate
    );
    const totalBillsExp = relevantBillsExp.reduce((sum, e) => sum + e.amount, 0);

    const startBillsBalance = runningBillsBalance;
    const endBillsBalance = startBillsBalance + finalBillsAlloc - totalBillsExp;
    const minBillsBalance = Math.min(startBillsBalance + finalBillsAlloc, endBillsBalance);
    runningBillsBalance = endBillsBalance;

    billsCellsMap.set(colDate, {
      allocated: Number(finalBillsAlloc.toFixed(2)),
      projectedBalance: Number(endBillsBalance.toFixed(2)),
      minProjectedBalance: Number(minBillsBalance.toFixed(2)),
      isOverride: hasBillsOverride,
      hasWarning: minBillsBalance < 0,
    });

    // C. Individual Goals & Surplus Target
    for (const cat of [...goalCats, ...surplusCats]) {
      const overrideKey = `${colDate}_${cat.id}`;
      const hasOverride = typeof cellOverrides[overrideKey] === "number";
      const finalAllocation = hasOverride ? cellOverrides[overrideKey] : (columnAllocations.get(cat.id) ?? 0);

      const startBalance = runningGoalBalances.get(cat.id) ?? 0;
      const balanceAfterAlloc = startBalance + finalAllocation;

      const relevantExpenses = expenseEvents.filter(
        (e) => e.categoryId === cat.id && e.dueDate >= colDate && e.dueDate < nextColDate
      );
      const totalExpenses = relevantExpenses.reduce((sum, e) => sum + e.amount, 0);

      const endBalance = balanceAfterAlloc - totalExpenses;
      const minProjectedBalance = Math.min(balanceAfterAlloc, endBalance);

      runningGoalBalances.set(cat.id, endBalance);

      const cellMap = goalCellsMap.get(cat.id)!;
      cellMap.set(colDate, {
        allocated: Number(finalAllocation.toFixed(2)),
        projectedBalance: Number(endBalance.toFixed(2)),
        minProjectedBalance: Number(minProjectedBalance.toFixed(2)),
        isOverride: hasOverride,
        hasWarning: minProjectedBalance < 0,
      });
    }
  }

  // 5. Structure into 4 Clean Accordion Row Groups (Everyday & Bills at Pool Level)
  const everydayCellsRecord: Record<string, MatrixCellData> = {};
  const billsCellsRecord: Record<string, MatrixCellData> = {};
  for (const d of columnDates) {
    everydayCellsRecord[d] = everydayCellsMap.get(d)!;
    billsCellsRecord[d] = billsCellsMap.get(d)!;
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
    for (const d of columnDates) {
      rowCells[d] = cellMap.get(d)!;
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
    for (const d of columnDates) {
      rowCells[d] = cellMap.get(d)!;
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
