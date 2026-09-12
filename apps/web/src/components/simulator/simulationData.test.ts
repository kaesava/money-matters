import { describe, it, expect } from "vitest";
import { computeSimulationState, SIMULATION_MILESTONES } from "./simulationData";

describe("Cashflow Simulator Mathematical Model", () => {
  it("defines 6 sequential timeline milestones spanning Day 0 to Day 28", () => {
    expect(SIMULATION_MILESTONES).toHaveLength(6);
    expect(SIMULATION_MILESTONES[0]?.day).toBe(0);
    expect(SIMULATION_MILESTONES[5]?.day).toBe(28);
  });

  it("calculates Day 0 Payday 1 allocation with Car Reserve at 50% ($75)", () => {
    const state = computeSimulationState(0);
    expect(state.day).toBe(0);
    expect(state.bills.current).toBe(1000);
    expect(state.bills.target).toBe(1000);
    expect(state.everyday.current).toBe(600);
    expect(state.goals.current).toBe(525); // 300 emergency + 150 holiday + 75 car
    expect(state.surplusOffset).toBe(375);
    expect(state.activeMilestone.day).toBe(0);
  });

  it("simulates Day 3 Rent payment from Bills Pool with daily living drawdown on Everyday", () => {
    const state = computeSimulationState(3);
    expect(state.day).toBe(3);
    expect(state.bills.current).toBe(200); // $800 rent paid from Bills Pool
    expect(state.everyday.current).toBe(525); // Daily living drawdown ($25/day * 3)
    expect(state.goals.current).toBe(525);
    expect(state.activeMilestone.day).toBe(3);
  });

  it("simulates Day 7 Living expenses with weekend grocery haul on Everyday pool", () => {
    const state = computeSimulationState(7);
    expect(state.day).toBe(7);
    expect(state.everyday.current).toBe(355); // Weekday + weekend living drawdowns
    expect(state.bills.current).toBe(200); // Bills pool protected
    expect(state.activeMilestone.day).toBe(7);
  });

  it("simulates Day 14 Payday 2 where Everyday refreshes and Car Reserve reaches 100% ($150)", () => {
    const state = computeSimulationState(14);
    expect(state.day).toBe(14);
    expect(state.goals.current).toBe(600); // 100% full!
    const carSubItem = state.goals.subItems.find((s) => s.id === "car");
    expect(carSubItem?.current).toBe(150);
    expect(carSubItem?.target).toBe(150);
    expect(state.everyday.current).toBe(600); // Refreshed on Payday 2
    expect(state.surplusOffset).toBe(825); // Increased offset savings
    expect(state.activeMilestone.day).toBe(14);
  });

  it("simulates Day 18 Quarterly Power payment from Bills pool with ongoing Everyday drawdown", () => {
    const state = computeSimulationState(18);
    expect(state.day).toBe(18);
    expect(state.bills.current).toBe(480); // Power deducted from pre-accumulated bills
    expect(state.everyday.current).toBe(500); // Cycle day 4 (14 + 4 = 18): 600 - 100
    expect(state.activeMilestone.day).toBe(18);
  });

  it("completes full cycle at Day 28 with all milestones achieved", () => {
    const state = computeSimulationState(28);
    expect(state.day).toBe(28);
    expect(state.goals.current).toBe(600);
    expect(state.surplusOffset).toBe(825);
    expect(state.activeMilestone.day).toBe(28);
  });

  it("scales surplus when income is adjusted", () => {
    const stateHigh = computeSimulationState(0, 3200);
    expect(stateHigh.incomeAmount).toBe(3200);
    expect(stateHigh.surplusOffset).toBe(975); // Extra surplus swept to offset

    const stateTight = computeSimulationState(0, 2000);
    expect(stateTight.incomeAmount).toBe(2000);
    expect(stateTight.surplusOffset).toBe(50);
  });

  it("applies manual pool-to-pool transfers correctly", () => {
    const transfer = {
      id: "t-1",
      fromPoolId: "everyday" as const,
      toPoolId: "goals" as const,
      amount: 100,
      day: 5,
    };
    const stateBefore = computeSimulationState(4, 2500, [transfer]);
    expect(stateBefore.everyday.current).toBe(500);
    expect(stateBefore.goals.current).toBe(525);

    const stateAfter = computeSimulationState(5, 2500, [transfer]);
    expect(stateAfter.everyday.current).toBe(375); // 475 - 100
    expect(stateAfter.goals.current).toBe(625); // 525 + 100
  });
});
