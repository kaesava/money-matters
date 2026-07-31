export interface MobileFilterOption {
    id: string;
    label: string;
}
export interface MobileFilterGroup {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: MobileFilterOption[];
}
export interface MobileFilterBarProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    searchPlaceholder?: string;
    filterGroups?: MobileFilterGroup[];
    onClearAll?: () => void;
}
export default function MobileFilterBar({ searchQuery, onSearchChange, searchPlaceholder, filterGroups, onClearAll, }: MobileFilterBarProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MobileFilterBar.d.ts.map