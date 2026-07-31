import React from 'react';
export interface WebAttentionItem {
    readonly id: string;
    readonly name: string;
    readonly expectedAmount: number;
    readonly expectedDate: string;
    readonly categoryId: string | null;
    readonly isOverdue: boolean;
    readonly categoryBalance: number;
}
export interface WebAttentionItemsListProps {
    readonly items: readonly WebAttentionItem[];
    readonly onMarkPaid: (item: WebAttentionItem) => void;
    readonly formatAUD: (val: number | string) => string;
}
export declare const AttentionItemsList: React.FC<WebAttentionItemsListProps>;
export default AttentionItemsList;
//# sourceMappingURL=AttentionItemsList.d.ts.map