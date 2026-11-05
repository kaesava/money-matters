import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@money-matters/i18n";
import { styles } from "./MobileBankAccountsStyles";

export function HouseholdOptimizerBanner() {
  const router = useRouter();

  return (
    <View style={styles.optimizerBanner}>
      <View style={styles.optimizerContent}>
        <View style={styles.optimizerHeaderRow}>
          <Text style={styles.optimizerIcon}>💡</Text>
          <Text style={styles.optimizerTitle}>
            {t("bankAccounts.optimizerBannerTitle")}
          </Text>
        </View>
        <Text style={styles.optimizerDesc}>
          {t("bankAccounts.optimizerBannerDesc")}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.optimizerActionBtn}
        onPress={() => router.push("/(setup)?mode=rerun" as Href)}
        activeOpacity={0.8}
      >
        <Text style={styles.optimizerActionText}>
          {t("bankAccounts.optimizerBannerAction")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
