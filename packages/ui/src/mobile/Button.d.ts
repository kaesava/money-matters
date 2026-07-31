import React from 'react';
import { TouchableOpacityProps, StyleProp, TextStyle } from 'react-native';
export interface ButtonProps extends TouchableOpacityProps {
    variant?: 'primary' | 'secondary';
    textStyle?: StyleProp<TextStyle>;
    title: string;
}
export declare const Button: React.FC<ButtonProps>;
export default Button;
//# sourceMappingURL=Button.d.ts.map