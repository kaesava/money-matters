import { describe, it, expect } from "vitest";
import { t } from "@money-matters/i18n";

describe("Mobile Envelope Badge & Parity Tests", () => {
  it("resolves correct badge copy for all envelope types", () => {
    expect(t("categories.scheduledBillBadge")).toBe("Recurring");
    expect(t("categories.flexibleBillBadge")).toBe("Target Balance");
    expect(t("categories.targetDateGoalBadge")).toBe("Target Balance");
    expect(t("categories.ongoingGoalBadge")).toBe("Recurring");
    expect(t("categories.everydayBadge")).toBe("Everyday");
  });

  it("maps envelopeType and fundingMode to expected badge text for mobile cards", () => {
    function resolveBadge(envelopeType?: string | null, fundingMode?: string | null) {
      if (envelopeType === "BILL") {
        return fundingMode === "RECURRING" ? t("categories.scheduledBillBadge") : t("categories.flexibleBillBadge");
      }
      if (envelopeType === "GOAL") {
        return fundingMode === "RECURRING" ? t("categories.ongoingGoalBadge") : t("categories.targetDateGoalBadge");
      }
      if (envelopeType === "EVERYDAY") return t("categories.everydayBadge");
      return null;
    }

    expect(resolveBadge("BILL", "RECURRING")).toBe("Recurring");
    expect(resolveBadge("BILL", "TARGET_BALANCE")).toBe("Target Balance");
    expect(resolveBadge("GOAL", "TARGET_BALANCE")).toBe("Target Balance");
    expect(resolveBadge("GOAL", "RECURRING")).toBe("Recurring");
    expect(resolveBadge("EVERYDAY")).toBe("Everyday");
  });
});
