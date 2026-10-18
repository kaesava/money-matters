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

  // 1. Goal Achievement Date ("when can I achieve Goal X", "reach goal emergency fund")
  if (/(?:when|how long).*(?:achieve|reach|hit).*goal/i.test(q) || /goal.*(?:date|finish|complete)/i.test(q)) {
    const goalMatch = query.match(/(?:goal|for)\s+([a-zA-Z0-9\s]+?)(?:\?|$)/i);
    return {
      intent: "GOAL_ACHIEVEMENT_DATE",
      confidence: 1.0,
      params: { entityName: goalMatch?.[1]?.trim() },
    };
  }

  // 2. Can I Afford Check ("can I afford $500", "can I buy a laptop for $1200")
  if (/(?:can i afford|can we afford|afford to buy)/i.test(q)) {
    return {
      intent: "CAN_I_AFFORD",
      confidence: 1.0,
      params: { amount, date },
    };
  }

  // 3. Pool Balance ("how much is left in Everyday", "Everyday balance", "available to spend")
  if (/(?:how much.*(?:left|have|in)|balance.*(?:everyday|pool)|available to spend)/i.test(q)) {
    let poolName = "Everyday";
    if (/bills/i.test(q)) poolName = "Bills";
    else if (/goals?/i.test(q)) poolName = "Goals";
    else if (/surplus/i.test(q)) poolName = "Surplus";

    return {
      intent: "POOL_BALANCE",
      confidence: 1.0,
      params: { entityName: poolName },
    };
  }

  // 4. Next Payday ("when is my next payday", "payday allocation preview")
  if (/(?:when is|next).*(?:payday|pay day|pay)/i.test(q) || /(?:payday.*allocation)/i.test(q)) {
    return {
      intent: "NEXT_PAYDAY_ALLOCATION",
      confidence: 1.0,
      params: {},
    };
  }

  // 5. Bills Due Soon ("which bills are due", "bills due this week", "upcoming bills")
  if (/(?:bills?.*due|upcoming bills?|bills?.*next)/i.test(q)) {
    let daysAhead = 7;
    if (/\b(?:month|30 days)\b/i.test(q)) daysAhead = 30;
    else if (/\b(?:fortnight|2 weeks|14 days)\b/i.test(q)) daysAhead = 14;

    return {
      intent: "BILLS_DUE",
      confidence: 1.0,
      params: { daysAhead },
    };
  }

  // 6. Record Bill Payment ("I paid my internet bill $190 on 23-Jan", "paid rent $450")
  if (/(?:i paid|paid my|mark.*paid)/i.test(q)) {
    const billMatch = query.match(/(?:paid|mark)\s+(?:my\s+)?([a-zA-Z\s]+?)(?:\s+(?:bill|\$|\d|on|yesterday|today)|$)/i);
    return {
      intent: "RECORD_BILL_PAYMENT",
      confidence: 0.95,
      params: {
        entityName: billMatch?.[1]?.trim(),
        amount,
        date,
      },
    };
  }

  // 7. Did I pay bill X? ("did I pay internet", "is rent paid")
  if (/(?:did i pay|is.*paid|have i paid)/i.test(q)) {
    const billMatch = query.match(/(?:pay|is)\s+([a-zA-Z\s]+?)(?:\s+paid|\?|$)/i);
    return {
      intent: "BILL_PAYMENT_STATUS",
      confidence: 1.0,
      params: { entityName: billMatch?.[1]?.trim() },
    };
  }

  // 8. Add Expense/Transaction ("spent $45 at Woolworths", "add expense $30")
  if (/(?:spent|add expense|new expense|bought)/i.test(q)) {
    const merchantMatch = query.match(/(?:at|from|for)\s+([a-zA-Z0-9\s]+?)(?:\s+on|\?|$)/i);
    return {
      intent: "RECORD_TRANSACTION",
      confidence: 0.95,
      params: {
        entityName: merchantMatch?.[1]?.trim(),
        amount,
        date,
      },
    };
  }

  // 9. Transfer Funds ("transfer $100 from savings to everyday")
  if (/transfer/i.test(q)) {
    const fromMatch = query.match(/from\s+([a-zA-Z\s]+?)(?:\s+to|$)/i);
    const toMatch = query.match(/to\s+([a-zA-Z\s]+?)(?:\s+for|$|\?)/i);
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

  return null;
}
