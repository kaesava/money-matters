/**
 * CSV Formula Injection (CWE-1236) Neutralization & Serialization Helpers
 */

/**
 * Escapes a single CSV cell value and neutralizes spreadsheet formula injection
 * by prefixing leading `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Serializes a 2D array of CSV headers and row cells into a RFC-4180 compliant CSV string.
 */
export function serializeCsvRows(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(",");
  if (rows.length === 0) return `${headerLine}\n`;
  const rowLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","));
  return `${[headerLine, ...rowLines].join("\n")}\n`;
}

/**
 * Serializes an array of plain objects into a CSV string using the given ordered column keys.
 */
export function serializeCsvObjects<T extends Record<string, unknown>>(
  items: readonly T[],
  headers: readonly (keyof T & string)[]
): string {
  const rows = items.map((item) => headers.map((header) => item[header]));
  return serializeCsvRows(headers, rows);
}
