import { resolveAiConfig, DEFAULT_AI_MODEL_ID } from "@money-matters/config";
import { AssistantClassifiedIntentSchema, type AssistantClassifiedIntent } from "@money-matters/types";
import type { LlmProviderPort } from "../ports/index.js";

const SYSTEM_PROMPT = `You are Penny, an AI intent classifier for Money Matters.
Your ONLY role is to classify the user's natural language input into one of these intents:
- GOAL_ACHIEVEMENT_DATE
- CAN_I_AFFORD
- POOL_BALANCE
- NEXT_PAYDAY_ALLOCATION
- BILLS_DUE
- BILL_PAYMENT_STATUS
- RECORD_BILL_PAYMENT
- RECORD_TRANSACTION
- TRANSFER_FUNDS
- SPENDING_SUMMARY
- ADD_ENTITY
- NAVIGATE_HELP
- UNKNOWN

Rules:
1. Return ONLY a single raw valid JSON object matching this schema:
{"intent": "INTENT_NAME", "confidence": 0.0-1.0, "params": {"entityName": "...", "amount": 123.45, "date": "YYYY-MM-DD"}}
2. When the user mentions paying a bill or spending money, ALWAYS extract entityName (e.g. "internet", "electricity", "groceries") and amount.
3. Never execute actions or fabricate data. Do not wrap in markdown or backticks.`;

export class CloudflareGatewayLlmProvider implements LlmProviderPort {
  private getConfig() {
    return resolveAiConfig();
  }

  async classifyIntent(userText: string): Promise<AssistantClassifiedIntent | null> {
    const config = this.getConfig();
    if (!config.CF_AI_API_TOKEN) {
      console.warn("[Penny AI Gateway] Skipped: CF_AI_API_TOKEN is missing.");
      return null;
    }

    const endpoint = `https://gateway.ai.cloudflare.com/v1/${config.CF_ACCOUNT_ID}/${config.CF_AI_GATEWAY_ID}/workers-ai/v1/chat/completions`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.CF_AI_API_TOKEN}`,
          "Content-Type": "application/json",
          "cf-aig-cache-ttl": "3600",
        },
        body: JSON.stringify({
          model: config.AI_MODEL_ID || DEFAULT_AI_MODEL_ID,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userText.slice(0, 300) },
          ],
          max_tokens: 150,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.warn(`[Penny AI Gateway] HTTP ${res.status}:`, errorText);
        return null;
      }

      const json = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const rawContent = json.choices?.[0]?.message?.content?.trim();
      if (!rawContent) return null;

      // Extract JSON if wrapped in code blocks
      const cleanJson = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleanJson);
      return AssistantClassifiedIntentSchema.parse(parsed);
    } catch (err) {
      console.warn("[Penny AI Gateway] Intent classification failed:", err);
      return null;
    }
  }
}

