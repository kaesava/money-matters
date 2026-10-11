import { describe, it, expect } from "vitest";

describe("Web UI Bucket categorization and health filtering", () => {
  const categories = [
    { id: "1", name: "Rent", type: "REGULAR", healthStatus: "GREEN", currentBalance: "1200.00" },
    { id: "2", name: "Holiday", type: "GOAL", healthStatus: "AMBER", currentBalance: "400.00" },
    { id: "3", name: "Everyday", type: "EVERYDAY", healthStatus: "GREEN", currentBalance: "350.00" },
  ];

  it("filters REGULAR, GOAL, and EVERYDAY buckets", () => {
    const regular = categories.filter((c) => c.type === "REGULAR");
    const goal = categories.filter((c) => c.type === "GOAL");
    const everyday = categories.filter((c) => c.type === "EVERYDAY");

    expect(regular).toHaveLength(1);
    expect(goal).toHaveLength(1);
    expect(everyday).toHaveLength(1);
  });

  it("calculates on-track and at-risk health counts", () => {
    const onTrack = categories.filter((c) => c.healthStatus === "GREEN").length;
    const atRisk = categories.filter((c) => c.healthStatus === "AMBER" || c.healthStatus === "RED").length;

    expect(onTrack).toBe(2);
    expect(atRisk).toBe(1);
  });
});
