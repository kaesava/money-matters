import type { AssistantResult } from "@money-matters/types";

export interface SearchResultPage {
  id: string;
  title: string;
  subtitle?: string;
  route: string;
  keywords?: string[];
  isAction?: boolean;
}

const PENNY_LEAD_WORD_REGEX =
  /^(hi|hello|hey|help|how|what|when|why|who|can|will|should|which|where|create|add|new|make|edit|update|change|rename|move|transfer|pay|paid|spent|spend|log|record|show|open|go|tell|explain|check|am|are|do|is)\b/i;

export function shouldPrioritizeAskPenny(trimmedQuery: string, totalMatches: number): boolean {
  if (!trimmedQuery) return false;
  if (totalMatches === 0) return true;
  if (trimmedQuery.endsWith("?")) return true;
  return PENNY_LEAD_WORD_REGEX.test(trimmedQuery);
}

interface ErrorLike {
  message?: unknown;
  data?: { code?: unknown };
  shape?: { data?: { code?: unknown } };
}

export function mapTrpcAssistantError(err: unknown): Extract<AssistantResult, { type: "unavailable" }> {
  const errObj = typeof err === "object" && err !== null ? (err as ErrorLike) : {};
  const code =
    typeof errObj.data?.code === "string"
      ? errObj.data.code
      : typeof errObj.shape?.data?.code === "string"
        ? errObj.shape.data.code
        : "";
  const msg = typeof errObj.message === "string" ? errObj.message.toLowerCase() : "";

  if (code === "TOO_MANY_REQUESTS") return { type: "unavailable", reason: "rate_limited" };
  if (code === "UNAUTHORIZED") return { type: "unavailable", reason: "unauthenticated" };
  if (code === "FORBIDDEN" || msg.includes("subscription_")) {
    return { type: "unavailable", reason: "subscription_required" };
  }
  if (msg.includes("disabled")) return { type: "unavailable", reason: "disabled" };
  return { type: "unavailable", reason: "service_error" };
}

export function formatAiAnswerText(
  result: Extract<AssistantResult, { type: "answer" }>,
  translate: (key: string, values?: Record<string, string | number>) => string
): string {
  if (result.text && result.text.trim().length > 0) return result.text;
  if (result.templateKey) return translate(result.templateKey, result.templateValues);
  return "";
}

export function filterPagesByQuery(pages: SearchResultPage[], trimmedLower: string): SearchResultPage[] {
  if (!trimmedLower) return pages.slice(0, 4);
  return pages.filter(
    (p) =>
      p.title.toLowerCase().includes(trimmedLower) ||
      Boolean(p.subtitle?.toLowerCase().includes(trimmedLower)) ||
      Boolean(p.keywords?.some((kw) => kw.toLowerCase().includes(trimmedLower)))
  );
}
