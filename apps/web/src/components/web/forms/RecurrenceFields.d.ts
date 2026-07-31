interface RecurrenceFieldsProps {
    isRecurring: boolean;
    setIsRecurring: (val: boolean) => void;
    frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
    setFrequency: (val: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY") => void;
    startDate: string;
    setStartDate: (val: string) => void;
}
export declare function RecurrenceFields({ isRecurring, setIsRecurring, frequency, setFrequency, startDate, setStartDate, }: RecurrenceFieldsProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=RecurrenceFields.d.ts.map