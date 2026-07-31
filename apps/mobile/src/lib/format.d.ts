/**
 * Currency & Date Formatting Utility Suite
 *
 * Provides AUD currency formatting ($XX.XX and compact $XK), localized en-AU date rendering,
 * and relative date labeling (Today, Yesterday).
 */
/**
 * Formats a numeric value or numeric string as standard AUD currency ($XX.XX).
 *
 * @param value - Amount value to format
 * @returns Formatted currency string
 */
export declare function formatHealthStatus(status?: string | null): string;
export declare function formatAUD(value: number | string): string;
/**
 * Formats a numeric value as compact AUD currency ($1.5k).
 *
 * @param value - Amount value to format
 * @returns Compact formatted currency string
 */
export declare function formatAUDCompact(value: number | string): string;
/**
 * Formats a Date or date string into en-AU short date string (e.g. '15 Aug 2026').
 *
 * @param date - Date instance or ISO string
 * @returns Formatted date string
 */
export declare function formatDate(date: string | Date): string;
/**
 * Formats a Date into relative terms ('Today', 'Yesterday', or short date).
 *
 * @param date - Date instance or ISO string
 * @returns Relative date label
 */
export declare function formatRelativeDate(date: string | Date): string;
/**
 * Schedule Recurrence & Aussie Lingo Formatting Utility
 */
export interface ScheduleDetail {
    isRecurring: boolean;
    badgeText: string;
    detailText: string;
    frequencyLabel: string;
}
export declare function formatScheduleDetail(rrule?: string | null, startDate?: string | null): ScheduleDetail;
//# sourceMappingURL=format.d.ts.map