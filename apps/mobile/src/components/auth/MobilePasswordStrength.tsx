import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { evaluatePasswordStrength } from "@money-matters/types";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "@money-matters/ui/mobile";

interface MobilePasswordStrengthProps {
  password: string;
}

export function MobilePasswordStrength({ password }: MobilePasswordStrengthProps) {
  const strength = evaluatePasswordStrength(password);

  const getBarColor = () => {
    if (strength.score <= 1) return "#EF4444"; // rose-500
    if (strength.score === 2) return "#F59E0B"; // amber-500
    if (strength.score === 3) return "#3B82F6"; // blue-500
    return DESIGN_TOKENS.colors.success; // emerald / #22c55e
  };

  const barColor = getBarColor();

  return (
    <View style={styles.container}>
      {/* 4 segments */}
      <View style={styles.barTrack}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.barSegment,
              { backgroundColor: index < strength.score ? barColor : "#E2E8F0" },
            ]}
          />
        ))}
      </View>

      {/* Checklist items */}
      <View style={styles.reqGrid}>
        <View style={styles.reqCol}>
          <Text style={[styles.reqText, strength.hasMinLength && styles.reqTextValid]}>
            {strength.hasMinLength ? "✓" : "•"} {t("auth.passwordReqMinLength")}
          </Text>
          <Text style={[styles.reqText, strength.hasLower && styles.reqTextValid]}>
            {strength.hasLower ? "✓" : "•"} {t("auth.passwordReqLower")}
          </Text>
        </View>
        <View style={styles.reqCol}>
          <Text style={[styles.reqText, strength.hasUpper && styles.reqTextValid]}>
            {strength.hasUpper ? "✓" : "•"} {t("auth.passwordReqUpper")}
          </Text>
          <Text style={[styles.reqText, strength.hasNumberOrSpecial && styles.reqTextValid]}>
            {strength.hasNumberOrSpecial ? "✓" : "•"} {t("auth.passwordReqNumberOrSymbol")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 8,
    gap: 6,
  },
  barTrack: {
    flexDirection: "row",
    gap: 4,
    height: 4,
    width: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  barSegment: {
    flex: 1,
    height: "100%",
    borderRadius: 2,
  },
  reqGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  reqCol: {
    flex: 1,
    gap: 2,
  },
  reqText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: "500",
  },
  reqTextValid: {
    color: DESIGN_TOKENS.colors.success,
    fontWeight: "700",
  },
});
