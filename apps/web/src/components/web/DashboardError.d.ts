interface DashboardErrorProps {
    error: unknown;
    onRetry?: () => void;
    /** Compact mode — inline within a section rather than full-height */
    compact?: boolean;
}
/** Contextual error display for dashboard sections — never shows a generic "Something went wrong" */
export declare function DashboardError({ error, onRetry, compact }: DashboardErrorProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=DashboardError.d.ts.map