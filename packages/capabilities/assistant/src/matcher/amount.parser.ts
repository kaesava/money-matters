/**
 * Safely extracts Australian monetary amounts from text.
 * Handles formats like "$190", "$190.50", "190 dollars", "190 bucks".
 */
export function parseAmount(text: string): number | undefined {
  const match = text.match(/(?:\$|AUD\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(?:dollars?|bucks?))?/i);
  if (!match || !match[1]) return undefined;
  const num = parseFloat(match[1]);
  if (isNaN(num) || num <= 0 || num > 999_999_999) return undefined;
  return Math.round(num * 100) / 100;
}
