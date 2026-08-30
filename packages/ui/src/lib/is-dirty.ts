/**
 * Centralized Smart Form Dirty-Checking Utility
 *
 * Compares initial state values against current form state.
 * Handles strings (trimmed), numeric strings/numbers (parseFloat), booleans,
 * null/undefined, arrays (order-insensitive set equality), and nested objects.
 */

export function isSingleValueDirty(valInit: unknown, valCurr: unknown): boolean {
  if (valInit === valCurr) return false;

  // Handle null / undefined equivalence with empty string
  if ((valInit == null || valInit === "") && (valCurr == null || valCurr === "")) {
    return false;
  }
  if (valInit == null || valCurr == null) {
    return true;
  }

  // Booleans
  if (typeof valInit === "boolean" || typeof valCurr === "boolean") {
    return Boolean(valInit) !== Boolean(valCurr);
  }

  // Arrays (e.g. multi-selects, pool types checkboxes)
  if (Array.isArray(valInit) || Array.isArray(valCurr)) {
    if (!Array.isArray(valInit) || !Array.isArray(valCurr)) return true;
    if (valInit.length !== valCurr.length) return true;
    const sortedInit = [...valInit].map(String).sort();
    const sortedCurr = [...valCurr].map(String).sort();
    return sortedInit.some((item, idx) => item !== sortedCurr[idx]);
  }

  // Numeric strings or numbers (e.g. "100.00" vs "100")
  const numInit = typeof valInit === "number" ? valInit : parseFloat(String(valInit));
  const numCurr = typeof valCurr === "number" ? valCurr : parseFloat(String(valCurr));
  if (!isNaN(numInit) && !isNaN(numCurr) && String(valInit).trim() !== "" && String(valCurr).trim() !== "") {
    return Math.abs(numInit - numCurr) > Number.EPSILON;
  }

  // Strings (trimmed comparison)
  if (typeof valInit === "string" || typeof valCurr === "string") {
    return String(valInit).trim() !== String(valCurr).trim();
  }

  // Objects
  if (typeof valInit === "object" && typeof valCurr === "object") {
    return isFormDirty(valInit as Record<string, unknown>, valCurr as Record<string, unknown>);
  }

  return valInit !== valCurr;
}

export function isFormDirty<T extends Record<string, unknown>>(
  initial: T | null | undefined,
  current: T
): boolean {
  if (!initial) return true; // Creating a new record is always dirty

  const keys = new Set([...Object.keys(initial), ...Object.keys(current)]);

  for (const key of keys) {
    if (isSingleValueDirty(initial[key], current[key])) {
      return true;
    }
  }

  return false;
}
