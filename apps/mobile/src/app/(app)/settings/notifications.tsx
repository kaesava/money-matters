import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { DESIGN_TOKENS, MobileScreenWrapper, SwitchRow } from "@money-matters/ui/mobile";
import { t } from "@money-matters/i18n";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";

export default function MobileNotificationSettingsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updatePrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      utils.getUserPreferences.invalidate();
    },
  });

  const appPrefs = (userPrefQuery.data?.appPreferences || {}) as Record<string, unknown>;
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [paydayAlerts, setPaydayAlerts] = useState(true);
  const [balanceNudge, setBalanceNudge] = useState(true);

  useEffect(() => {
    if (userPrefQuery.data?.appPreferences) {
      const prefs = userPrefQuery.data.appPreferences as Record<string, unknown>;
      setWeeklyDigest(prefs.weekly_digest_enabled !== false);
      setPaydayAlerts(prefs.payday_alerts_enabled !== false);
      setBalanceNudge(prefs.balance_nudge_enabled !== false);
    }
  }, [userPrefQuery.data]);

  const handleToggle = (key: string, value: boolean) => {
    if (key === "weekly_digest_enabled") setWeeklyDigest(value);
    if (key === "payday_alerts_enabled") setPaydayAlerts(value);
    if (key === "balance_nudge_enabled") setBalanceNudge(value);

    updatePrefMutation.mutate({
      appPreferences: {
        "money-matters": {
          ...appPrefs,
          [key]: value,
        },
      },
    });
  };

  return (
    <MobileScreenWrapper
      title={t("notifications.settings.title")}
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
      infoTooltip={{
        title: t("tooltips.notifications.title"),
        content: t("tooltips.notifications.content"),
      }}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}>
        {/* Weekly Summary Digest */}
        <View style={styles.card}>
          <SwitchRow
            label={t("notifications.settings.weeklyDigestTitle")}
            hint={t("notifications.settings.weeklyDigestDesc")}
            value={weeklyDigest}
            onValueChange={(val) => handleToggle("weekly_digest_enabled", val)}
          />
        </View>

        {/* Payday Alerts */}
        <View style={styles.card}>
          <SwitchRow
            label={t("notifications.settings.paydayTitle")}
            hint={t("notifications.settings.paydayDesc")}
            value={paydayAlerts}
            onValueChange={(val) => handleToggle("payday_alerts_enabled", val)}
          />
        </View>

        {/* Balance Nudge */}
        <View style={styles.card}>
          <SwitchRow
            label={t("notifications.settings.balanceMatchTitle")}
            hint={t("notifications.settings.balanceMatchDesc")}
            value={balanceNudge}
            onValueChange={(val) => handleToggle("balance_nudge_enabled", val)}
          />
        </View>
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  card: {
    backgroundColor: D.colors.surface,
    borderRadius: D.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: D.colors.border,
    gap: 12,
  },
});
