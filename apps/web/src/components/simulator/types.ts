export interface SubCategoryItem {
  id: string;
  name: string;
  current: number;
  target: number;
  priorityLabel?: string;
  speedMultiplier: number; // e.g. 1.0, 1.4 for variable visual speed fill
}

export interface PoolSnapshot {
  id: string;
  name: string;
  stepNumber: string;
  current: number;
  target: number;
  subItems: SubCategoryItem[];
  isSurplus?: boolean;
}

export interface TimelineMilestone {
  day: number;
  labelKey: string;
  eventDescKey: string;
  badge: string;
  icon: string;
}

export interface PoolTransfer {
  id: string;
  fromPoolId: "everyday" | "bills" | "goals" | "surplus";
  toPoolId: "everyday" | "bills" | "goals" | "surplus";
  amount: number;
  day: number;
}

export interface SimulationDayState {
  day: number;
  activeMilestone: TimelineMilestone;
  bills: PoolSnapshot;
  goals: PoolSnapshot;
  everyday: PoolSnapshot;
  surplusOffset: number;
  incomeAmount: number;
  isPayday: boolean;
  dailyDrawdown: number;
  commentary: string;
}
