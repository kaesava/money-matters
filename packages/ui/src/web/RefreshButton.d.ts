interface RefreshButtonProps {
    /** Called when the user clicks refresh. Can be async. */
    onRefresh: () => void | Promise<void>;
    /** When true, the icon animates with a spin. */
    isRefreshing?: boolean;
    /** Tooltip label. */
    title?: string;
    className?: string;
}
/**
 * Reusable header refresh button that animates while data is being fetched.
 *
 * Usage replaces `onClick={() => window.location.reload()}` calls across all
 * dashboard views. The button calls `onRefresh` (typically a tRPC `refetch()`)
 * and shows a spinning icon to communicate activity without a full page reload.
 */
export declare function RefreshButton({ onRefresh, isRefreshing, title, className, }: RefreshButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=RefreshButton.d.ts.map