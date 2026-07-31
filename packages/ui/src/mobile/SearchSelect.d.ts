import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
export interface MobileSearchSelectOption {
    value: string;
    label: string;
    subLabel?: string;
    searchKeywords?: string;
}
export interface MobileSearchSelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: MobileSearchSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    error?: string;
    containerStyle?: StyleProp<ViewStyle>;
    required?: boolean;
    renderOption?: (item: MobileSearchSelectOption, isSelected: boolean) => React.ReactNode;
}
export declare const SearchSelect: React.FC<MobileSearchSelectProps>;
export default SearchSelect;
//# sourceMappingURL=SearchSelect.d.ts.map