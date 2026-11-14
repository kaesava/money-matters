import { describe, it, expect } from "vitest";
import {
  shouldPrioritizeAskPenny,
  mapTrpcAssistantError,
  formatAiAnswerText,
  filterPagesByQuery,
} from "./commandPaletteHelpers";

describe("commandPaletteHelpers", () => {
  it("prioritizes Ask Penny on greetings, questions, action verbs, or zero matches", () => {
    expect(shouldPrioritizeAskPenny("", 0)).toBe(false);
    expect(shouldPrioritizeAskPenny("Hi", 2)).toBe(true);
    expect(shouldPrioritizeAskPenny("When is my next payday", 1)).toBe(true);
    expect(shouldPrioritizeAskPenny("Groceries?", 3)).toBe(true);
    expect(shouldPrioritizeAskPenny("xyz", 0)).toBe(true);
    expect(shouldPrioritizeAskPenny("Groceries", 2)).toBe(false);
    expect(shouldPrioritizeAskPenny("Savings", 1)).toBe(false);
  });

  it("maps tRPC errors accurately without masking failures as disabled", () => {
    expect(mapTrpcAssistantError({ data: { code: "TOO_MANY_REQUESTS" } }).reason).toBe("rate_limited");
    expect(mapTrpcAssistantError({ data: { code: "UNAUTHORIZED" } }).reason).toBe("unauthenticated");
    expect(mapTrpcAssistantError({ data: { code: "FORBIDDEN" } }).reason).toBe("subscription_required");
    expect(mapTrpcAssistantError(new Error("Network offline")).reason).toBe("service_error");
  });

  it("prefers freeform text answer over templateKey fallback", () => {
    const tr = (k: string) => `t(${k})`;
    expect(formatAiAnswerText({ type: "answer", text: "You have $420 left." }, tr)).toBe("You have $420 left.");
    expect(formatAiAnswerText({ type: "answer", templateKey: "assistant.answers.greetingHelp" }, tr)).toBe(
      "t(assistant.answers.greetingHelp)"
    );
  });

  it("filters pages by title, subtitle, and keywords", () => {
    const pages = [
      { id: "plan", title: "Upcoming Bills & Income", subtitle: "Timeline", route: "/dashboard/plan", keywords: ["schedules"] },
      { id: "home", title: "Home", route: "/dashboard" },
    ];
    expect(filterPagesByQuery(pages, "schedules").map((p) => p.id)).toEqual(["plan"]);
    expect(filterPagesByQuery(pages, "")).toHaveLength(2);
  });
});
