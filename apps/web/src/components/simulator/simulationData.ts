import { SimulationDayState, TimelineMilestone, PoolTransfer, PoolSnapshot } from "./types";

export const SIMULATION_MILESTONES: TimelineMilestone[] = [
  { day: 0, labelKey: "landing.simDay0", eventDescKey: "landing.simEventPayday1", badge: "Payday #1", icon: "💰" },
  { day: 3, labelKey: "landing.simDay3", eventDescKey: "landing.simEventRent", badge: "Rent Due", icon: "🏠" },
  { day: 7, labelKey: "landing.simDay7", eventDescKey: "landing.simEventGroceries", badge: "Weekly Living", icon: "🛒" },
  { day: 14, labelKey: "landing.simDay14", eventDescKey: "landing.simEventPayday2", badge: "Payday #2", icon: "💰" },
  { day: 18, labelKey: "landing.simDay18", eventDescKey: "landing.simEventPower", badge: "Quarterly Bill", icon: "⚡" },
  { day: 28, labelKey: "landing.simDay28", eventDescKey: "landing.simEventMilestones", badge: "Cycle Complete", icon: "🎯" },
];

function resolveActiveMilestone(day: number): TimelineMilestone {
  for (let i = SIMULATION_MILESTONES.length - 1; i >= 0; i--) {
    const m = SIMULATION_MILESTONES[i];
    if (m && day >= m.day) return m;
  }
  return SIMULATION_MILESTONES[0]!;
}

function getDailyBurn(day: number): number {
  const cycleDay = day % 14;
  if (cycleDay === 0) return 0;
  return (cycleDay === 6 || cycleDay === 7) ? 60 : 25;
}

function computeCumulativeDrawdown(day: number): number {
  const cycleDay = day % 14;
  let total = 0;
  for (let d = 1; d <= cycleDay; d++) {
    total += (d === 6 || d === 7) ? 60 : 25;
  }
  return total;
}

function computeBillsSnapshot(day: number): PoolSnapshot {
  let rent = 800;
  let power = 200;
  if (day >= 3 && day < 14) {
    rent = 0;
    power = 200;
  } else if (day >= 14 && day < 18) {
    rent = 400;
    power = 400;
  } else if (day >= 18) {
    rent = 400;
    power = 80;
  }
  return {
    id: "bills",
    name: "Bills Pool",
    stepNumber: "STEP 1",
    current: rent + power,
    target: 1000,
    subItems: [
      { id: "rent", name: "Rent & Mortgage", current: rent, target: 800, priorityLabel: "High Priority", speedMultiplier: 1.4 },
      { id: "power", name: "Utilities & Subscriptions", current: power, target: 200, speedMultiplier: 1.0 },
    ],
  };
}

function computeGoalsSnapshot(day: number): PoolSnapshot {
  const emergency = 300;
  const holiday = 150;
  const car = day >= 14 ? 150 : 75;
  return {
    id: "goals",
    name: "Committed Goals",
    stepNumber: "STEP 2",
    current: emergency + holiday + car,
    target: 600,
    subItems: [
      { id: "emergency", name: "Emergency Buffer", current: emergency, target: 300, priorityLabel: "High Priority", speedMultiplier: 1.3 },
      { id: "holiday", name: "Holiday Goal", current: holiday, target: 150, speedMultiplier: 1.0 },
      { id: "car", name: "Car Maintenance", current: car, target: 150, speedMultiplier: 0.9 },
    ],
  };
}

function computeEverydaySnapshot(day: number, income: number): PoolSnapshot {
  const baseAllocation = income >= 3000 ? 700 : income < 2200 ? 500 : 600;
  const drawdown = computeCumulativeDrawdown(day);
  const current = Math.max(80, baseAllocation - drawdown);
  const groceries = Math.round(current * 0.65);
  const personal = current - groceries;

  return {
    id: "everyday",
    name: "Everyday Living",
    stepNumber: "STEP 3",
    current,
    target: baseAllocation,
    subItems: [
      { id: "groceries", name: "Groceries & Household", current: groceries, target: Math.round(baseAllocation * 0.65), speedMultiplier: 1.1 },
      { id: "personal", name: "Personal Discretionary", current: personal, target: Math.round(baseAllocation * 0.35), speedMultiplier: 0.8 },
    ],
  };
}

function applyTransfers(
  pools: { bills: PoolSnapshot; goals: PoolSnapshot; everyday: PoolSnapshot; surplus: number },
  transfers: PoolTransfer[],
  day: number
) {
  for (const t of transfers) {
    if (day < t.day) continue;
    if (t.fromPoolId === "everyday") pools.everyday.current -= t.amount;
    else if (t.fromPoolId === "bills") pools.bills.current -= t.amount;
    else if (t.fromPoolId === "goals") pools.goals.current -= t.amount;
    else if (t.fromPoolId === "surplus") pools.surplus -= t.amount;

    if (t.toPoolId === "everyday") pools.everyday.current += t.amount;
    else if (t.toPoolId === "bills") pools.bills.current += t.amount;
    else if (t.toPoolId === "goals") pools.goals.current += t.amount;
    else if (t.toPoolId === "surplus") pools.surplus += t.amount;
  }
}

function resolveCommentary(day: number, dailyBurn: number, transfers: PoolTransfer[]): string {
  const activeTransfer = transfers.find((t) => t.day === day);
  if (activeTransfer) {
    return `Manual Transfer: Shifted $${activeTransfer.amount} from ${activeTransfer.fromPoolId} to ${activeTransfer.toPoolId}. Balances recalibrated.`;
  }
  if (day === 0) return "Payday 1 arrives: Income allocated upfront into Bills, Goals, Everyday, and Surplus.";
  if (day === 3) return "Day 3: Rent ($800) paid from ring-fenced Bills Pool. Everyday allowance stays 100% untouched.";
  if (day === 7) return "Day 7: Weekend grocery haul ($60) deducted from Everyday pool. Zero impact on bills.";
  if (day === 14) return "Payday 2 lands: Everyday allowance refreshed, power pre-funded, and Car Reserve reaches 100%!";
  if (day === 18) return "Day 18: Quarterly Electricity ($320) paid smoothly from pre-saved bills pool. Zero bill shock.";
  if (day === 28) return "Day 28: Month complete! All bills paid on time, goals funded, surplus growing offset.";
  return `Day ${day}: Daily living burn (-$${dailyBurn}) drawn from Everyday allowance. Bills pool remains 100% safe.`;
}

export function computeSimulationState(
  day: number,
  incomeAmount = 2500,
  transfers: PoolTransfer[] = []
): SimulationDayState {
  const activeMilestone = resolveActiveMilestone(day);
  const bills = computeBillsSnapshot(day);
  const goals = computeGoalsSnapshot(day);
  const everyday = computeEverydaySnapshot(day, incomeAmount);

  const baseSurplus = Math.max(50, incomeAmount - 1000 - 525 - everyday.target);
  const surplusOffset = day >= 14 ? baseSurplus * 2 + 75 : baseSurplus;

  const poolPack = { bills, goals, everyday, surplus: surplusOffset };
  applyTransfers(poolPack, transfers, day);

  const dailyBurn = getDailyBurn(day);
  const commentary = resolveCommentary(day, dailyBurn, transfers);

  return {
    day,
    activeMilestone,
    bills: poolPack.bills,
    goals: poolPack.goals,
    everyday: poolPack.everyday,
    surplusOffset: poolPack.surplus,
    incomeAmount,
    isPayday: day === 0 || day === 14,
    dailyDrawdown: dailyBurn,
    commentary,
  };
}
