import React from 'react';
export interface SearchSelectOption {
    value: string;
    label: string;
    subLabel?: string;
    searchKeywords?: string;
}
export interface SearchSelectProps {
    options: SearchSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    renderOption?: (option: SearchSelectOption, isSelected: boolean) => React.ReactNode;
}
export declare const SearchSelect: React.FC<SearchSelectProps>;
//# sourceMappingURL=SearchSelect.d.ts.map