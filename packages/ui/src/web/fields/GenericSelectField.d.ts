export interface SelectOption {
    value: string;
    label: string;
}
export interface GenericSelectFieldProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: SelectOption[];
    required?: boolean;
    className?: string;
    placeholder?: string;
}
export declare function GenericSelectField({ label, value, onChange, options, required, className, placeholder, }: GenericSelectFieldProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GenericSelectField.d.ts.map