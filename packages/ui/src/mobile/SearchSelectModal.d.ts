import React from 'react';
import { MobileSearchSelectOption } from './SearchSelect';
interface SearchSelectModalProps {
    visible: boolean;
    onClose: () => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    searchPlaceholder?: string;
    filteredOptions: MobileSearchSelectOption[];
    value: string;
    handleSelect: (val: string) => void;
    renderOption?: (item: MobileSearchSelectOption, isSelected: boolean) => React.ReactNode;
    styles: any;
}
export declare function SearchSelectModal({ visible, onClose, searchQuery, setSearchQuery, searchPlaceholder, filteredOptions, value, handleSelect, renderOption, styles, }: SearchSelectModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SearchSelectModal.d.ts.map