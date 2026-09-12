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

  it("simulates Day 3 Rent payment from Bills Pool while keeping Everyday living untouched", () => {
    const state = computeSimulationState(3);
    expect(state.day).toBe(3);
    expect(state.bills.current).toBe(200); // $800 rent paid from Bills Pool
    expect(state.everyday.current).toBe(600); // 100% untouched Everyday living!
    expect(state.goals.current).toBe(525);
    expect(state.activeMilestone.day).toBe(3);
  });

  it("simulates Day 7 Living expenses drawn from Everyday pool", () => {
    const state = computeSimulationState(7);
    expect(state.day).toBe(7);
    expect(state.everyday.current).toBe(420); // Groceries $260 + Personal $160
    expect(state.bills.current).toBe(200); // Bills pool protected
    expect(state.activeMilestone.day).toBe(7);
  });

  it("simulates Day 14 Payday 2 where Car Reserve reaches 100% ($150)", () => {
    const state = computeSimulationState(14);
    expect(state.day).toBe(14);
    expect(state.goals.current).toBe(600); // 100% full!
    const carSubItem = state.goals.subItems.find((s) => s.id === "car");
    expect(carSubItem?.current).toBe(150);
    expect(carSubItem?.target).toBe(150);
    expect(state.everyday.current).toBe(600); // Refreshed
    expect(state.surplusOffset).toBe(825); // Increased offset savings
    expect(state.activeMilestone.day).toBe(14);
  });

  it("simulates Day 18 Quarterly Power payment from Bills pool without touching Everyday", () => {
    const state = computeSimulationState(18);
    expect(state.day).toBe(18);
    expect(state.bills.current).toBe(480);
    expect(state.everyday.current).toBe(600);
    expect(state.activeMilestone.day).toBe(18);
  });

  it("completes full cycle at Day 28 with all milestones achieved", () => {
    const state = computeSimulationState(28);
    expect(state.day).toBe(28);
    expect(state.goals.current).toBe(600);
    expect(state.surplusOffset).toBe(825);
    expect(state.activeMilestone.day).toBe(28);
  });
});
