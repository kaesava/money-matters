/**
 * Extracts positive monetary amounts from natural language queries without assuming a single region.
 * Handles formats like "$190", "¥5000", "190.50", "190 dollars", "190 bucks", "paid 50".
 */
export function parseAmount(text: string): number | undefined {
  const symbolMatch =
    text.match(/(?:[$€£¥₹]|USD|AUD|CAD|GBP|EUR|NZD|JPY)\s*(\d+(?:[.,]\d{1,2})?)/i) ||
    text.match(/(\d+(?:\.\d{1,2})?)\s*(?:USD|AUD|CAD|GBP|EUR|NZD|JPY|dollars?|bucks?|pounds?|euros?|yen)/i);

  if (symbolMatch?.[1]) {
    const num = parseFloat(symbolMatch[1].replace(",", "."));
    if (!isNaN(num) && num > 0 && num <= 999_999_999) {
      return Math.round(num * 100) / 100;
    }
  }

  const verbMatch = text.match(
    /(?:paid|spent|cost|bought|transfer|afford|for)\s+(?:(?:my|an|a|the)\s+)?(?:[a-zA-Z\s]+?\s+)?(\d+(?:\.\d{1,2})?)(?!\s*(?:days?|weeks?|months?|years?|st|nd|rd|th|am|pm))/i
  );
  if (verbMatch?.[1]) {
    const num = parseFloat(verbMatch[1]);
    if (!isNaN(num) && num > 0 && num <= 999_999_999) {
      return Math.round(num * 100) / 100;
    }
  }

  return undefined;
}
