import React from "react";
import { ActivityIndicator, View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { DESIGN_TOKENS } from "../tokens";

export interface SpinnerProps {
  size?: "small" | "large";
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Spinner({ 
  size = "small", 
  color = DESIGN_TOKENS.colors.accent,
  style 
}: SpinnerProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Spinner;
