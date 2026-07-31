import React from "react";
export interface UpcomingEvent {
    id: string;
    type: "INCOME" | "EXPENSE";
    name: string;
    expectedDate: string;
    expectedAmount: string;
    categoryName: string;
    categoryId: string | null;
    note: string;
    isNextPayday: boolean;
    isRecurring?: boolean;
    seriesId?: string;
    seriesName?: string;
}
interface UpcomingEventsListProps {
    events: UpcomingEvent[];
    selectedEventKeys: string[];
    setSelectedEventKeys: React.Dispatch<React.SetStateAction<string[]>>;
    upcomingFilter: "ALL" | "INCOME" | "EXPENSE";
    setUpcomingFilter: (filter: "ALL" | "INCOME" | "EXPENSE") => void;
    upcomingSearch: string;
    setUpcomingSearch: (search: string) => void;
    isPendingDelete: boolean;
    onBulkDelete: () => void;
    onProcessPayday: (evt: UpcomingEvent) => void;
    onMarkPaid: (evt: UpcomingEvent) => void;
    fmt: (val: string | number) => string;
    fmtAUDate: (dStr: string) => string;
    todayStr: string;
}
export declare function UpcomingEventsList({ events, selectedEventKeys, setSelectedEventKeys, upcomingFilter, setUpcomingFilter, upcomingSearch, setUpcomingSearch, isPendingDelete, onBulkDelete, onProcessPayday, onMarkPaid, fmt, fmtAUDate, todayStr, }: UpcomingEventsListProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=UpcomingEventsList.d.ts.map