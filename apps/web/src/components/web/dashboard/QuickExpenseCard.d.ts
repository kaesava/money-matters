import React from "react";
interface Category {
    id: string;
    name: string;
    currentBalance: string;
}
interface BankAccount {
    id: string;
    name: string;
}
interface QuickExpenseCardProps {
    categories: Category[];
    bankAccounts?: BankAccount[];
    quickType: "DEBIT" | "CREDIT";
    setQuickType: (type: "DEBIT" | "CREDIT") => void;
    quickName: string;
    setQuickName: (name: string) => void;
    quickCategoryId: string;
    setQuickCategoryId: (id: string) => void;
    quickReceivingAccountId: string;
    setQuickReceivingAccountId: (id: string) => void;
    quickAmount: string;
    setQuickAmount: (amt: string) => void;
    quickDate: string;
    setQuickDate: (date: string) => void;
    quickNote: string;
    setQuickNote: (note: string) => void;
    quickMsg: string | null;
    isPending: boolean;
    onSubmit: (e: React.FormEvent) => void;
}
export declare function QuickExpenseCard({ categories, bankAccounts, quickType, setQuickType, quickName, setQuickName, quickCategoryId, setQuickCategoryId, quickReceivingAccountId, setQuickReceivingAccountId, quickAmount, setQuickAmount, quickDate, setQuickDate, quickNote, setQuickNote, quickMsg, isPending, onSubmit, }: QuickExpenseCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=QuickExpenseCard.d.ts.map