interface IncomeSetupStepProps {
    incomeName: string;
    setIncomeName: (val: string) => void;
    incomeAmount: string;
    setIncomeAmount: (val: string) => void;
    incomeFreq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
    setIncomeFreq: (val: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY") => void;
    onNext: () => void;
}
export declare function IncomeSetupStep({ incomeName, setIncomeName, incomeAmount, setIncomeAmount, incomeFreq, setIncomeFreq, onNext, }: IncomeSetupStepProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=IncomeSetupStep.d.ts.map