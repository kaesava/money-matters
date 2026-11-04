import React from 'react';
import { StyleSheet, View, Dimensions, Pressable } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

export interface TargetLayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MobileProductTourSpotlightProps {
  targetRect: TargetLayoutRect | null;
  onDismiss: () => void;
}

export function MobileProductTourSpotlight({
  targetRect,
  onDismiss,
}: MobileProductTourSpotlightProps) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const padding = 8;
  const radius = 12;

  const targetX = targetRect ? Math.max(0, targetRect.x - padding) : 0;
  const targetY = targetRect ? Math.max(0, targetRect.y - padding) : 0;
  const targetWidth = targetRect ? targetRect.width + padding * 2 : 0;
  const targetHeight = targetRect ? targetRect.height + padding * 2 : 0;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss}>
        <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFillObject}>
          <Defs>
            <Mask id="mobile-spotlight-mask">
              <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="white" />
              {targetRect && (
                <Rect
                  x={targetX}
                  y={targetY}
                  width={targetWidth}
                  height={targetHeight}
                  rx={radius}
                  ry={radius}
                  fill="black"
                />
              )}
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={screenWidth}
            height={screenHeight}
            fill="rgba(15, 23, 42, 0.65)"
            mask="url(#mobile-spotlight-mask)"
          />
          {targetRect && (
            <Rect
              x={targetX}
              y={targetY}
              width={targetWidth}
              height={targetHeight}
              rx={radius}
              ry={radius}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray={[6, 4]}
            />
          )}
        </Svg>
      </Pressable>
    </View>
  );
}
