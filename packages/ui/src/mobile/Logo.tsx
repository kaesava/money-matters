import React from "react";
import { Image, View, StyleSheet, ImageSourcePropType, StyleProp, ViewStyle } from "react-native";

export interface MobileLogoProps {
  size?: number;
  source?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}

export function MobileLogo({ 
  size = 64, 
  source = require("../../../../assets/brand/money-matters-icon-512.png"),
  style 
}: MobileLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={source}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
});

export default MobileLogo;
