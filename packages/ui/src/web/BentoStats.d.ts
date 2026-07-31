interface BentoStatsProps {
    entityLabel: string;
    activeCount: number;
    archivedCount: number;
    totalCount: number;
    isFetching: boolean;
}
/**
 * A beautiful, generic Bento-grid style metrics display card.
 * Renders active, archived, and total counts for any record type.
 */
export declare function BentoStats({ entityLabel, activeCount, archivedCount, totalCount, isFetching, }: BentoStatsProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BentoStats.d.ts.map