import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface CardDrawerIndicatorProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function CardDrawerIndicator({
  size = 16,
  color = '#94A3B8',
  style,
}: CardDrawerIndicatorProps) {
  return (
    <View style={[styles.container, style]}>
      <Feather name="chevron-right" size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CardDrawerIndicator;
