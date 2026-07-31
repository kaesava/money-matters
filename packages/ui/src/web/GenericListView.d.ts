import React from 'react';
export interface ColumnDefinition<T> {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    align?: 'left' | 'right' | 'center';
}
export interface FilterOption {
    key: string;
    label: string;
}
export interface GenericListViewProps<T> {
    title: string;
    subtitle?: string;
    addButtonLabel?: string;
    onAddClick?: () => void;
    items: T[];
    isLoading: boolean;
    isFetching: boolean;
    onRefresh: () => void | Promise<void>;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    searchPlaceholder?: string;
    page?: number;
    totalPages?: number;
    pageSize?: number;
    totalItems?: number;
    pageSizeOptions?: number[];
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    viewModeKey: string;
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
    columns: ColumnDefinition<T>[];
    gridItemRender: (item: T, onViewDetails: (item: T) => void) => React.ReactNode;
    onRowClick?: (item: T) => void;
    emptyStateIcon?: React.ComponentType<any>;
    emptyStateText?: string;
}
export declare function GenericListView<T extends {
    id: string;
}>({ title, subtitle, addButtonLabel, onAddClick, items, isLoading, isFetching, onRefresh, searchQuery, onSearchChange, searchPlaceholder, page, totalPages, pageSize, totalItems, pageSizeOptions, onPageChange, onPageSizeChange, viewModeKey, sortBy, onSortByChange, sortOptions, sortOrder, onSortOrderToggle, showArchived, onShowArchivedChange, activeFilterKey, onFilterKeyChange, filterOptions, categoryValue, onCategoryChange, categoryOptions, columns, gridItemRender, onRowClick, emptyStateText, }: GenericListViewProps<T>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GenericListView.d.ts.map