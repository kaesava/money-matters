import { FilterOption } from './GenericListView';
interface ListViewToolbarProps {
    title: string;
    subtitle?: string;
    addButtonLabel?: string;
    onAddClick?: () => void;
    isFetching: boolean;
    onRefresh: () => void | Promise<void>;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    searchPlaceholder?: string;
    viewMode: 'list' | 'grid';
    setViewMode: (mode: 'list' | 'grid') => void;
    sortBy: string;
    onSortByChange: (sort: string) => void;
    sortOptions: {
        value: string;
        label: string;
    }[];
    sortOrder: 'asc' | 'desc';
    onSortOrderToggle: () => void;
    showArchived?: boolean;
    onShowArchivedChange?: (show: boolean) => void;
    activeFilterKey?: string;
    onFilterKeyChange?: (key: string) => void;
    filterOptions?: FilterOption[];
    categoryValue?: string;
    onCategoryChange?: (val: string) => void;
    categoryOptions?: {
        value: string;
        label: string;
    }[];
}
export declare function ListViewToolbar({ title, subtitle, addButtonLabel, onAddClick, isFetching, onRefresh, searchQuery, onSearchChange, searchPlaceholder, viewMode, setViewMode, sortBy, onSortByChange, sortOptions, sortOrder, onSortOrderToggle, showArchived, onShowArchivedChange, activeFilterKey, onFilterKeyChange, filterOptions, categoryValue, onCategoryChange, categoryOptions, }: ListViewToolbarProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ListViewToolbar.d.ts.map