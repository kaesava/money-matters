import React from 'react';
import { ViewProps, StyleProp, TextStyle } from 'react-native';
export interface BadgeProps extends ViewProps {
    variant?: 'primary' | 'success' | 'danger' | 'warning';
    textStyle?: StyleProp<TextStyle>;
    children: string;
}
export declare const Badge: React.FC<BadgeProps>;
export default Badge;
//# sourceMappingURL=Badge.d.ts.map