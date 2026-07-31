import React from 'react';
import { TextInput, TextInputProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
export interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: StyleProp<ViewStyle>;
    labelStyle?: StyleProp<TextStyle>;
}
export declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<TextInput>>;
export default Input;
//# sourceMappingURL=Input.d.ts.map