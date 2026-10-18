import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "../tokens";
import { t } from "@money-matters/i18n";

export interface MobileAiUsageCardProps {
  used: number;
  limit: number;
  resetsOn: string;
}

export const MobileAiUsageCard: React.FC<MobileAiUsageCardProps> = ({ used, limit, resetsOn }) => {
  const percentage = Math.min(100, Math.round((used / limit) * 100));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Feather name="zap" size={20} color={DESIGN_TOKENS.colors.sereneBlue} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.titleText}>{t("assistant.settingsCard.title")}</Text>
          <Text style={styles.descText}>{t("assistant.settingsCard.description")}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.metricRow}>
          <Text style={styles.usageLabel}>
            {t("assistant.settingsCard.usedLabel", { used, limit })}
          </Text>
          <Text style={styles.percentText}>{percentage}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%` as const },
              percentage > 90 ? styles.barDanger : percentage > 75 ? styles.barWarning : styles.barPrimary,
            ]}
          />
        </View>
      </View>

      <Text style={styles.footerText}>
        {t("assistant.settingsCard.resetsOn", { date: resetsOn })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    padding: 8,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderRadius: 8,
  },
  headerTextCol: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  descText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 2,
  },
  progressContainer: {
    gap: 6,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  usageLabel: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[700],
  },
  percentText: {
    fontSize: 12,
    fontFamily: DESIGN_TOKENS.fonts.mono,
    color: DESIGN_TOKENS.colors.slate[500],
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 999,
  },
  barPrimary: {
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  barWarning: {
    backgroundColor: DESIGN_TOKENS.colors.warning,
  },
  barDanger: {
    backgroundColor: DESIGN_TOKENS.colors.critical,
  },
  footerText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
  },
});
