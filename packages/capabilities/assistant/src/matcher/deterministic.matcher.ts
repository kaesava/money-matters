import type { AssistantClassifiedIntent } from "@money-matters/types";
import { parseAmount } from "./amount.parser.js";
import { parseDate } from "./date.parser.js";

/**
 * High-precision deterministic matcher for the top common financial questions.
 * Costs $0 in LLM tokens and resolves instantly.
 */
export function matchDeterministicIntent(query: string): AssistantClassifiedIntent | null {
  const q = query.trim().toLowerCase();
  const amount = parseAmount(query);
  const date = parseDate(query);

  // 1. Goal Achievement Date ("when can I achieve Goal X", "when will I reach my goal", "how long to hit goal car")
  if (
    /(?:when|how long).*(?:achieve|reach|hit|finish|complete).*goal/i.test(q) ||
    /goal.*(?:date|finish|complete|target)/i.test(q)
  ) {
    const goalMatch = query.match(/(?:goal|for)\s+([a-zA-Z0-9\s]+?)(?:\?|$)/i);
    let entity = goalMatch?.[1]?.trim();
    if (entity && /^my\s+goal$/i.test(entity)) entity = undefined;
    return {
      intent: "GOAL_ACHIEVEMENT_DATE",
      confidence: 1.0,
      params: { entityName: entity },
    };
  }

  // 2. Can I Afford Check ("can I afford $250 next week", "can we afford to buy a laptop for $1200", "is $300 affordable")
  if (/(?:can i afford|can we afford|afford to buy|is.*affordable|can i buy)/i.test(q)) {
    return {
      intent: "CAN_I_AFFORD",
      confidence: 1.0,
      params: { amount, date },
    };
  }

  // 3. Pool Balance ("how much is left in everyday", "everyday balance", "available to spend", "bills balance")
  if (
    /(?:how much|what.*balance|balance.*of|available to spend|how much.*can i spend|how much.*money)/i.test(q) &&
    /(?:left|have|in|balance|pool|spend|everyday|bills|goals?|surplus)/i.test(q)
  ) {
    let poolName = "Everyday";
    if (/\bbills?\b/i.test(q)) poolName = "Bills";
    else if (/\bgoals?\b/i.test(q)) poolName = "Goals";
    else if (/\bsurplus\b/i.test(q)) poolName = "Surplus";

    return {
      intent: "POOL_BALANCE",
      confidence: 1.0,
      params: { entityName: poolName },
    };
  }

  // 4. Next Payday ("when is my next payday", "when do I get paid", "preview payday", "next paycheck")
  if (
    /(?:when.*(?:payday|pay day|get paid|pay cheque|paycheck|income)|next.*(?:payday|pay day|pay|income|paycheck)|payday.*(?:preview|allocation|split))/i.test(q)
  ) {
    return {
      intent: "NEXT_PAYDAY_ALLOCATION",
      confidence: 1.0,
      params: {},
    };
  }

  // 5. Bills Due Soon ("which bills are due this week", "upcoming bills", "bills due in 14 days", "what do I have to pay")
  if (
    /(?:which bills|what bills|upcoming bills|bills?.*due|bills?.*coming up|what do i have to pay)/i.test(q)
  ) {
    let daysAhead = 7;
    if (/\b(?:month|30\s*days?)\b/i.test(q)) daysAhead = 30;
    else if (/\b(?:fortnight|2\s*weeks?|14\s*days?)\b/i.test(q)) daysAhead = 14;

    return {
      intent: "BILLS_DUE",
      confidence: 1.0,
      params: { daysAhead },
    };
  }

  // 6. Did I pay bill X? ("did i pay internet", "is rent paid", "has electricity been paid", "have i paid water")
  if (/(?:did i pay|have i paid|has.*been paid|is.*paid)/i.test(q)) {
    const billMatch =
      query.match(/(?:did i pay|have i paid)\s+(?:(?:my|an|a|the)\s+)?([a-zA-Z\s]+?)(?:\s+bill|\?|$)/i) ||
      query.match(/(?:has|is)\s+(?:(?:my|an|a|the)\s+)?([a-zA-Z\s]+?)(?:\s+(?:bill|been\s+paid|paid)|\?|$)/i);
    const rawEntity = billMatch?.[1]?.trim().replace(/^(?:a|an|the|my)\s+/i, "");
    return {
      intent: "BILL_PAYMENT_STATUS",
      confidence: 1.0,
      params: { entityName: rawEntity },
    };
  }

  // 7. Record Bill Payment ("i paid an internet bill for $50", "paid $50 for internet", "paid internet $50", "mark internet paid", "mark rent as paid")
  if (/(?:i paid|paid|mark.*paid)/i.test(q)) {
    // Determine entity name by stripping leading triggers and trailing noise
    const billMatch =
      query.match(/(?:paid|mark)\s+(?:(?:my|an|a|the)\s+)?([a-zA-Z\s]+?)(?:\s+(?:bill|\$|\d|for|on|yesterday|today|as\s+paid|paid)|$)/i) ||
      query.match(/for\s+([a-zA-Z\s]+?)(?:\s+(?:bill|\$|\d|on|yesterday|today)|$)/i);

    let cleanEntity = billMatch?.[1]?.trim().replace(/^(?:my|an|a|the)\s+/i, "");
    if (cleanEntity?.toLowerCase() === "bill") cleanEntity = undefined;

    return {
      intent: "RECORD_BILL_PAYMENT",
      confidence: 0.95,
      params: {
        entityName: cleanEntity,
        amount,
        date,
      },
    };
  }


  // 8. Add Expense/Transaction ("spent $45 at Woolworths", "spent $20 on coffee", "bought groceries for $80", "add expense $30 for lunch")
  if (/(?:spent|add expense|new expense|bought|purchased|cost me)/i.test(q)) {
    const merchantMatch =
      query.match(/(?:at|from|on|for)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:for\s+)?\$|\s+on|\s+yesterday|\s+today|\?|$)/i) ||
      query.match(/(?:bought|purchased|spent)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:for\s+)?\$|\s+on|\s+yesterday|\s+today|\?|$)/i);
    const rawEntity = merchantMatch?.[1]?.trim().replace(/^(?:a|an|the|my)\s+/i, "");
    return {
      intent: "RECORD_TRANSACTION",
      confidence: 0.95,
      params: {
        entityName: rawEntity,
        amount,
        date,
      },
    };
  }

  // 9. Transfer Funds ("transfer $100 from savings to everyday", "move $50 from buffer to bills")
  if (/(?:transfer|move\s+(?:money|\$|\d))/i.test(q)) {
    const fromMatch = query.match(/from\s+([a-zA-Z\s]+?)(?:\s+to|$)/i);
    const toMatch = query.match(/to\s+([a-zA-Z\s]+?)(?:\s+(?:from|for)|\$|\?|$)/i);
    return {
      intent: "TRANSFER_FUNDS",
      confidence: 0.95,
      params: {
        amount,
        sourceAccount: fromMatch?.[1]?.trim(),
        destinationAccount: toMatch?.[1]?.trim(),
      },
    };
  }

  // 10. Spending Summary ("how much did i spend on groceries", "spending summary", "spending on coffee")
  if (/(?:how much.*spent|spending.*summary|show.*spending|spent on)/i.test(q)) {
    const catMatch = query.match(/on\s+([a-zA-Z\s]+?)(?:\s+this|\s+last|\?|$)/i);
    return {
      intent: "SPENDING_SUMMARY",
      confidence: 0.95,
      params: { categoryName: catMatch?.[1]?.trim() },
    };
  }

  // 11. Navigation & Direct Action Helpers ("add income", "new bill", "view transactions", "bank accounts", "settings")
  if (/(?:add|create|new)\s+(?:income|paycheck|salary)/i.test(q)) {
    return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "income-and-bills" } };
  }
  if (/(?:add|create|new)\s+bill/i.test(q)) {
    return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "income-and-bills" } };
  }
  if (/(?:add|create|new)\s+(?:envelope|pool|category|goal)/i.test(q)) {
    return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "envelopes" } };
  }
  if (/(?:view|show|open|go to)\s+(?:transactions?|history|ledger)/i.test(q)) {
    return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "history" } };
  }
  if (/(?:view|show|open|go to)\s+(?:bank\s+accounts?|accounts?)/i.test(q)) {
    return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "bank-accounts" } };
  }
  if (/(?:settings|preferences|profile)/i.test(q)) {
    return { intent: "NAVIGATE_HELP", confidence: 1.0, params: { targetScreen: "settings" } };
  }

  return null;
}

