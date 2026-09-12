import { SimulationDayState, TimelineMilestone } from "./types";

export const SIMULATION_MILESTONES: TimelineMilestone[] = [
  {
    day: 0,
    labelKey: "landing.simDay0",
    eventDescKey: "landing.simEventPayday1",
    badge: "Payday #1",
    icon: "💰",
  },
  {
    day: 3,
    labelKey: "landing.simDay3",
    eventDescKey: "landing.simEventRent",
    badge: "Rent Due",
    icon: "🏠",
  },
  {
    day: 7,
    labelKey: "landing.simDay7",
    eventDescKey: "landing.simEventGroceries",
    badge: "Weekly Living",
    icon: "🛒",
  },
  {
    day: 14,
    labelKey: "landing.simDay14",
    eventDescKey: "landing.simEventPayday2",
    badge: "Payday #2",
    icon: "💰",
  },
  {
    day: 18,
    labelKey: "landing.simDay18",
    eventDescKey: "landing.simEventPower",
    badge: "Quarterly Bill",
    icon: "⚡",
  },
  {
    day: 28,
    labelKey: "landing.simDay28",
    eventDescKey: "landing.simEventMilestones",
    badge: "Cycle Complete",
    icon: "🎯",
  },
];

function resolveActiveMilestone(day: number): TimelineMilestone {
  for (let i = SIMULATION_MILESTONES.length - 1; i >= 0; i--) {
    const m = SIMULATION_MILESTONES[i];
    if (m && day >= m.day) {
      return m;
    }
  }
  return SIMULATION_MILESTONES[0]!;
}

function computeBillsSnapshot(day: number) {
  let rent = 800;
  let power = 200;
  if (day >= 3 && day < 14) {
    rent = 0; // Rent paid on Day 3
    power = 200;
  } else if (day >= 14 && day < 18) {
    rent = 400; // Accruing towards next month's rent
    power = 400; // Pre-funded quarterly power
  } else if (day >= 18) {
    rent = 400;
    power = 80; // Paid $320 power bill
  }

  const current = rent + power;
  const target = 1000;
  return {
    id: "bills",
    name: "Bills Pool",
    stepNumber: "STEP 1",
    current,
    target,
    subItems: [
      { id: "rent", name: "Rent & Mortgage", current: rent, target: 800, priorityLabel: "High Priority", speedMultiplier: 1.4 },
      { id: "power", name: "Utilities & Subscriptions", current: power, target: 200, speedMultiplier: 1.0 },
    ],
  };
}

function computeGoalsSnapshot(day: number) {
  const emergency = 300;
  const holiday = 150;
  // Car reserve hits 50% ($75) on Day 0, and 100% ($150) on Day 14!
  const car = day >= 14 ? 150 : 75;
  const current = emergency + holiday + car;
  const target = 600;

  return {
    id: "goals",
    name: "Committed Goals",
    stepNumber: "STEP 2",
    current,
    target,
    subItems: [
      { id: "emergency", name: "Emergency Buffer", current: emergency, target: 300, priorityLabel: "High Priority", speedMultiplier: 1.3 },
      { id: "holiday", name: "Holiday Goal", current: holiday, target: 150, speedMultiplier: 1.0 },
      { id: "car", name: "Car Maintenance", current: car, target: 150, speedMultiplier: 0.9 },
    ],
  };
}

function computeEverydaySnapshot(day: number) {
  let groceries = 400;
  let personal = 200;

  if (day >= 7 && day < 14) {
    groceries = 260; // spent $140
    personal = 160; // spent $40
  } else if (day >= 14 && day < 21) {
    groceries = 400; // refreshed on Payday 2
    personal = 200;
  } else if (day >= 21) {
    groceries = 240;
    personal = 140;
  }

  const current = groceries + personal;
  const target = 600;
  return {
    id: "everyday",
    name: "Everyday Living",
    stepNumber: "STEP 3",
    current,
    target,
    subItems: [
      { id: "groceries", name: "Groceries & Household", current: groceries, target: 400, speedMultiplier: 1.1 },
      { id: "personal", name: "Personal Discretionary", current: personal, target: 200, speedMultiplier: 0.8 },
    ],
  };
}

export function computeSimulationState(day: number): SimulationDayState {
  const activeMilestone = resolveActiveMilestone(day);
  const bills = computeBillsSnapshot(day);
  const goals = computeGoalsSnapshot(day);
  const everyday = computeEverydaySnapshot(day);
  const surplusOffset = day >= 14 ? 825 : 375;

  return {
    day,
    activeMilestone,
    bills,
    goals,
    everyday,
    surplusOffset,
  };
}
