import React from 'react';
export interface AttentionItem {
    readonly id: string;
    readonly name: string;
    readonly expectedAmount: number;
    readonly expectedDate: string;
    readonly categoryId: string | null;
    readonly isOverdue: boolean;
    readonly categoryBalance: number;
}
export interface AttentionItemsListProps {
    readonly items: readonly AttentionItem[];
    readonly onMarkPaid: (item: AttentionItem) => void;
}
export declare const AttentionItemsList: React.FC<AttentionItemsListProps>;
export default AttentionItemsList;
//# sourceMappingURL=AttentionItemsList.d.ts.map