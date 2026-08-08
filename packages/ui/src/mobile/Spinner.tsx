import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, ViewStyle, StyleProp } from "react-native";
import { DESIGN_TOKENS } from "../tokens";

export interface SpinnerProps {
  size?: "small" | "large";
  color?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function Spinner({
  size = "small",
  color = DESIGN_TOKENS.colors.accent,
  label,
  style,
}: SpinnerProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous rotation for ring
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Rhythmic pulse for inner coin core
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 450,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 450,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    spinLoop.start();
    pulseLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [spinAnim, pulseAnim]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const outerSize = size === "large" ? 44 : 26;
  const innerSize = size === "large" ? 22 : 13;
  const fontSize = size === "large" ? 11 : 8;

  return (
    <View style={[styles.container, style]}>
      <View style={{ width: outerSize, height: outerSize, alignItems: "center", justifyContent: "center" }}>
        {/* Outer Orbiting Ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
              borderColor: `${color}33`,
              borderTopColor: color,
              transform: [{ rotate: spinInterpolate }],
            },
          ]}
        />
        {/* Inner Pulsing Money Core ($) */}
        <Animated.View
          style={[
            styles.coinCore,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: DESIGN_TOKENS.colors.primary,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={[styles.coinText, { fontSize }]}>$</Text>
        </Animated.View>
      </View>

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
    gap: 6,
  },
  ring: {
    position: "absolute",
    borderWidth: 2.5,
  },
  coinCore: {
    alignItems: "center",
    justifyContent: "center",
  },
  coinText: {
    color: "#FFFFFF",
    fontWeight: "900",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textMuted,
  },
});

export default Spinner;
