import { describe, it, expect } from "vitest";
import { t } from "@money-matters/i18n";

describe("Mobile Envelope Badge & Parity Tests", () => {
  it("resolves correct badge copy for all envelope types", () => {
    expect(t("categories.scheduledBillBadge")).toBe("Scheduled Bill");
    expect(t("categories.flexibleBillBadge")).toBe("Flexible Bill");
    expect(t("categories.targetDateGoalBadge")).toBe("Target Goal");
    expect(t("categories.ongoingGoalBadge")).toBe("Ongoing Goal");
    expect(t("categories.everydayBadge")).toBe("Everyday");
  });

  it("maps envelopeType to expected badge text for mobile cards", () => {
    function resolveBadge(envelopeType?: string | null, poolType?: string | null) {
      if (envelopeType === "SCHEDULED_BILL") return t("categories.scheduledBillBadge");
      if (envelopeType === "FLEXIBLE_BILL") return t("categories.flexibleBillBadge");
      if (envelopeType === "TARGET_GOAL") return t("categories.targetDateGoalBadge");
      if (envelopeType === "ONGOING_GOAL") return t("categories.ongoingGoalBadge");
      if (envelopeType === "EVERYDAY" || poolType === "EVERYDAY") return t("categories.everydayBadge");
      return null;
    }

    expect(resolveBadge("SCHEDULED_BILL")).toBe("Scheduled Bill");
    expect(resolveBadge("FLEXIBLE_BILL")).toBe("Flexible Bill");
    expect(resolveBadge("TARGET_GOAL")).toBe("Target Goal");
    expect(resolveBadge("ONGOING_GOAL")).toBe("Ongoing Goal");
    expect(resolveBadge("EVERYDAY")).toBe("Everyday");
    expect(resolveBadge(null, "EVERYDAY")).toBe("Everyday");
  });
});
