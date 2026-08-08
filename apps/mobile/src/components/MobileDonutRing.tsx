import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export interface MobileDonutRingProps {
  readonly timeElapsedPct: number;
  readonly consumedPct: number;
  readonly centerLabel: string;
  readonly subLabel?: string;
  readonly size?: number;
  readonly strokeWidth?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const MobileDonutRing: React.FC<MobileDonutRingProps> = ({
  timeElapsedPct,
  consumedPct,
  centerLabel,
  subLabel = 'Everyday Balance',
  size = 120,
  strokeWidth = 9,
}) => {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const timeAnim = useRef(new Animated.Value(circumference)).current;
  const consumedAnim = useRef(new Animated.Value(circumference)).current;

  const targetTimeOffset = circumference - (Math.min(100, Math.max(0, timeElapsedPct)) / 100) * circumference;
  const targetConsumedOffset = circumference - (Math.min(100, Math.max(0, consumedPct)) / 100) * circumference;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(timeAnim, {
        toValue: targetTimeOffset,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(consumedAnim, {
        toValue: targetConsumedOffset,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [targetTimeOffset, targetConsumedOffset]);

  let consumedColor = '#22c55e'; // Green
  if (consumedPct > timeElapsedPct + 15) {
    consumedColor = '#ba1a1a'; // Red
  } else if (consumedPct > timeElapsedPct + 5) {
    consumedColor = '#f59e0b'; // Amber
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Track Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
        />

        {/* Time Elapsed Arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#2563eb"
          strokeWidth={strokeWidth / 2}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={timeAnim}
          strokeLinecap="round"
          opacity={0.4}
        />

        {/* Consumed Arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={consumedColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={consumedAnim}
          strokeLinecap="round"
        />
      </Svg>

      <View style={styles.labelOverlay}>
        <Text style={styles.subLabel} numberOfLines={1}>
          {subLabel}
        </Text>
        <Text style={styles.centerLabel} numberOfLines={1}>
          {centerLabel}
        </Text>
        <Text style={styles.pctText}>{consumedPct}% spent</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  labelOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  subLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  centerLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  pctText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 1,
  },
});

export default MobileDonutRing;
