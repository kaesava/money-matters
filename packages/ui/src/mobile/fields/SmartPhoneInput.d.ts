import React from 'react';
interface SmartPhoneInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    country?: string;
    error?: string | null;
}
export declare function SmartPhoneInput({ label, value, onChangeText, placeholder, country, error, }: SmartPhoneInputProps): React.JSX.Element;
export {};
//# sourceMappingURL=SmartPhoneInput.d.ts.map