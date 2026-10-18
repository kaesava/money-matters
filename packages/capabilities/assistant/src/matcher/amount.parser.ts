/**
 * Safely extracts Australian monetary amounts from text.
 * Handles formats like "$190", "$190.50", "190 dollars", "190 bucks".
 */
export function parseAmount(text: string): number | undefined {
  // 1. Explicit currency symbol or code: $150, $ 150.50, AUD 150, 150 AUD, 150 dollars
  const symbolMatch =
    text.match(/(?:\$|AUD\s*)\s*(\d+(?:\.\d{1,2})?)/i) ||
    text.match(/(\d+(?:\.\d{1,2})?)\s*(?:AUD|dollars?|bucks?)/i);
  if (symbolMatch && symbolMatch[1]) {
    const num = parseFloat(symbolMatch[1]);
    if (!isNaN(num) && num > 0 && num <= 999_999_999) return Math.round(num * 100) / 100;
  }

  // 2. Financial action verbs with standalone numbers: paid 50, spent 120, transfer 400, afford 250
  const verbMatch = text.match(
    /(?:paid|spent|cost|bought|transfer|afford|for)\s+(?:(?:my|an|a|the)\s+)?(?:[a-zA-Z\s]+?\s+)?(\d+(?:\.\d{1,2})?)(?!\s*(?:days?|weeks?|months?|years?|st|nd|rd|th|am|pm))/i
  );
  if (verbMatch && verbMatch[1]) {
    const num = parseFloat(verbMatch[1]);
    if (!isNaN(num) && num > 0 && num <= 999_999_999) return Math.round(num * 100) / 100;
  }

  return undefined;
}
