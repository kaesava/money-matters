export const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function parseIso(isoStr?: string): Date {
  if (!isoStr) return new Date();
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  return new Date();
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}
