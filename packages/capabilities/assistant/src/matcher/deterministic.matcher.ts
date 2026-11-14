import type { AssistantClassifiedIntent } from "@money-matters/types";
import { parseAmount } from "./amount.parser.js";
import { parseDate } from "./date.parser.js";

function matchGreetingOrGoal(q: string, query: string): AssistantClassifiedIntent | null {
  if (/^(?:hi|hello|hey|hiya|yo|good\s+(?:morning|afternoon|evening)|help|what can you do|how do i use this)[\s!?.]*$/i.test(q)) {
    return { intent: "GREETING_HELP", confidence: 1.0, params: {} };
  }
  if (
    /(?:when|how long).*(?:achieve|reach|hit|finish|complete).*goal/i.test(q) ||
    /goal.*(?:date|finish|complete|target)/i.test(q)
  ) {
    const goalMatch = query.match(/(?:goal|for)\s+([a-zA-Z0-9\s]+?)(?:\?|$)/i);
    let entity = goalMatch?.[1]?.trim();
    if (entity && /^my\s+goal$/i.test(entity)) entity = undefined;
    return { intent: "GOAL_ACHIEVEMENT_DATE", confidence: 1.0, params: { entityName: entity } };
  }
  return null;
}

function matchBalanceOrCashflow(
  q: string,
  query: string,
  amount?: number,
  date?: string
): AssistantClassifiedIntent | null {
  if (/(?:can i afford|can we afford|afford to buy|is.*affordable|can i buy)/i.test(q)) {
    return { intent: "CAN_I_AFFORD", confidence: 1.0, params: { amount, date } };
  }
  if (
    /(?:how much|what(?:'s| is)).*(?:left|remaining|available|balance)/i.test(q) ||
    /(?:available to spend|how much.*can i spend)/i.test(q)
  ) {
    const inMatch = query.match(/(?:in|for)\s+(?:my\s+|the\s+)?([a-zA-Z0-9\s]+?)(?:\s+envelope|\s+pool|\?|$)/i);
    const prefixMatch = query.match(/^([a-zA-Z0-9\s]+?)\s+balance\??$/i);
    const entity =
      inMatch?.[1]?.trim() ||
      prefixMatch?.[1]?.trim() ||
      (/\bbills?\b/i.test(q) ? "Bills" : /\bgoals?\b/i.test(q) ? "Goals" : /\bsurplus\b/i.test(q) ? "Surplus" : "Everyday");
    return { intent: "POOL_BALANCE", confidence: 1.0, params: { entityName: entity } };
  }
  if (/(?:when.*(?:payday|pay day|get paid|pay cheque|paycheck|income)|next.*(?:payday|pay day|pay|income|paycheck)|payday.*(?:preview|allocation|split))/i.test(q)) {
    return { intent: "NEXT_PAYDAY_ALLOCATION", confidence: 1.0, params: {} };
  }
  return null;
}

function matchBillsAndTransactions(
  q: string,
  query: string,
  amount?: number,
  date?: string
): AssistantClassifiedIntent | null {
  if (/(?:which bills|what bills|upcoming bills|bills?.*due|bills?.*coming up|what do i have to pay)/i.test(q)) {
    const daysAhead = /\b(?:month|30\s*days?)\b/i.test(q) ? 30 : /\b(?:fortnight|2\s*weeks?|14\s*days?)\b/i.test(q) ? 14 : 7;
    return { intent: "BILLS_DUE", confidence: 1.0, params: { daysAhead } };
  }
  if (/(?:did i pay|have i paid|has.*been paid|is.*paid)/i.test(q)) {
    const billMatch =
      query.match(/(?:did i pay|have i paid)\s+(?:(?:my|an|a|the)\s+)?([a-zA-Z0-9\s]+?)(?:\s+bill|\?|$)/i) ||
      query.match(/(?:has|is)\s+(?:(?:my|an|a|the)\s+)?([a-zA-Z0-9\s]+?)(?:\s+(?:bill|been\s+paid|paid)|\?|$)/i);
    return { intent: "BILL_PAYMENT_STATUS", confidence: 1.0, params: { entityName: billMatch?.[1]?.trim().replace(/^(?:a|an|the|my)\s+/i, "") } };
  }
  if (/(?:i paid|paid|mark.*paid)/i.test(q)) {
    const billMatch =
      query.match(/(?:paid|mark)\s+(?:(?:my|an|a|the)\s+)?([a-zA-Z\s]+?)(?:\s+(?:bill|\$|\d|for|on|yesterday|today|as\s+paid|paid)|$)/i) ||
      query.match(/for\s+([a-zA-Z\s]+?)(?:\s+(?:bill|\$|\d|on|yesterday|today)|$)/i);
    let cleanEntity = billMatch?.[1]?.trim().replace(/^(?:my|an|a|the)\s+/i, "");
    if (cleanEntity?.toLowerCase() === "bill") cleanEntity = undefined;
    return { intent: "RECORD_BILL_PAYMENT", confidence: 0.95, params: { entityName: cleanEntity, amount, date } };
  }
  return null;
}

function matchExpenseTransferOrSummary(
  q: string,
  query: string,
  amount?: number,
  date?: string
): AssistantClassifiedIntent | null {
  if (/(?:spent|add expense|new expense|bought|purchased|cost me)/i.test(q)) {
    const merchantMatch =
      query.match(/(?:at|from|on|for)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:for\s+)?\$|\s+on|\s+yesterday|\s+today|\?|$)/i) ||
      query.match(/(?:bought|purchased|spent)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:for\s+)?\$|\s+on|\s+yesterday|\s+today|\?|$)/i);
    return {
      intent: "RECORD_TRANSACTION",
      confidence: 0.95,
      params: { entityName: merchantMatch?.[1]?.trim().replace(/^(?:a|an|the|my)\s+/i, ""), amount, date },
    };
  }
  if (/(?:transfer|move\s+(?:money|\$|\d))/i.test(q)) {
    const fromMatch = query.match(/from\s+([a-zA-Z\s]+?)(?:\s+to|$)/i);
    const toMatch = query.match(/to\s+([a-zA-Z\s]+?)(?:\s+(?:from|for)|\$|\?|$)/i);
    return {
      intent: "TRANSFER_FUNDS",
      confidence: 0.95,
      params: { amount, sourceAccount: fromMatch?.[1]?.trim(), destinationAccount: toMatch?.[1]?.trim() },
    };
  }
  if (/(?:how much.*spent|spending.*summary|show.*spending|spent on)/i.test(q)) {
    const catMatch = query.match(/on\s+([a-zA-Z\s]+?)(?:\s+this|\s+last|\?|$)/i);
    return { intent: "SPENDING_SUMMARY", confidence: 0.95, params: { categoryName: catMatch?.[1]?.trim() } };
  }
  return null;
}

function matchCrudOrNavigation(
  q: string,
  query: string,
  amount?: number,
  date?: string
): AssistantClassifiedIntent | null {
  const createMatch = query.match(/(?:add|create|new)\s+(?:an?\s+)?(?:(income|paycheck|salary)|(bill)|(envelope|category|goal))(?:\s+(?:called|named|for)?\s*([a-zA-Z0-9\s]+?))?(?:\s+(?:for|\$|\d)|$)/i);
  if (createMatch) {
    const categoryName = createMatch[1] ? "income" : createMatch[2] ? "bill" : "envelope";
    return { intent: "ADD_ENTITY", confidence: 0.95, params: { categoryName, entityName: createMatch[4]?.trim(), amount, date } };
  }
  const editMatch = query.match(/(?:edit|update|rename|change)\s+(?:my\s+)?(?:(income|paycheck|salary)|(bill)|(envelope|category|goal))\s+([a-zA-Z0-9\s]+?)$/i);
  if (editMatch) {
    const categoryName = editMatch[1] ? "income" : editMatch[2] ? "bill" : "envelope";
    return { intent: "EDIT_ENTITY", confidence: 0.95, params: { categoryName, entityName: editMatch[4]?.trim() } };
  }
  if (/(?:view|show|open|go to)\s+(?:transactions?|history)/i.test(q)) return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "history" } };
  if (/(?:view|show|open|go to)\s+(?:bank\s+accounts?|accounts?)/i.test(q)) return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "bank-accounts" } };
  if (/(?:view|show|open|go to)\s+(?:plan|upcoming|bills|schedules?)/i.test(q)) return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "plan" } };
  if (/(?:view|show|open|go to)\s+(?:12[- ]?month|projection|forecast)/i.test(q)) return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "projection" } };
  if (/^(?:settings|preferences|profile)$/i.test(q) || /(?:open|go to)\s+settings/i.test(q)) return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "settings" } };
  return null;
}

/**
 * High-precision deterministic matcher for common financial queries ($0 LLM cost).
 */
export function matchDeterministicIntent(query: string, timeZone?: string): AssistantClassifiedIntent | null {
  const q = query.trim().toLowerCase();
  const amount = parseAmount(query);
  const date = parseDate(query, timeZone);

  return (
    matchGreetingOrGoal(q, query) ||
    matchBalanceOrCashflow(q, query, amount, date) ||
    matchBillsAndTransactions(q, query, amount, date) ||
    matchExpenseTransferOrSummary(q, query, amount, date) ||
    matchCrudOrNavigation(q, query, amount, date)
  );
}
