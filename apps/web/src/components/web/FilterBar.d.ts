export interface FilterOption {
    id: string;
    label: string;
}
export interface FilterGroupProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    searchPlaceholder?: string;
    filterGroups?: {
        label: string;
        value: string;
        onChange: (val: string) => void;
        options: FilterOption[];
        defaultValue: string;
    }[];
    onClearAll?: () => void;
}
export declare function FilterBar({ searchQuery, onSearchChange, searchPlaceholder, filterGroups, onClearAll, }: FilterGroupProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FilterBar.d.ts.map