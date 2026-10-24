import { describe, it, expect } from "vitest";
import { FIRST_RUN_SETUP_STEPS, RERUN_SETUP_STEPS, getSetupSteps, getTotalSetupSteps } from "./setup-steps.types.js";

describe("Setup Steps Parity", () => {
  it("defines ordered steps for first-run setup matching exactly 5 steps ending with review", () => {
    expect(FIRST_RUN_SETUP_STEPS.map((s) => s.id)).toEqual([
      "income",
      "accounts",
      "goals",
      "lifestyle",
      "review",
    ]);
    expect(getTotalSetupSteps(false)).toBe(4); // 4 active steps prior to review
  });

  it("defines ordered steps for rerun setup matching exactly 3 steps ending with review", () => {
    expect(RERUN_SETUP_STEPS.map((s) => s.id)).toEqual([
      "income",
      "goals",
      "review",
    ]);
    expect(getTotalSetupSteps(true)).toBe(2); // 2 active steps prior to review
  });

  it("getSetupSteps returns corresponding array according to isRerun flag", () => {
    expect(getSetupSteps(false)).toEqual(FIRST_RUN_SETUP_STEPS);
    expect(getSetupSteps(true)).toEqual(RERUN_SETUP_STEPS);
  });
});
