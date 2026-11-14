import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { DESIGN_TOKENS, MobileScreenWrapper, SwitchRow, MobileButton, useMobileToast } from "@money-matters/ui/mobile";
import { t } from "@money-matters/i18n";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";

function resolvePrefsBlob(raw: unknown, appId?: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const map = raw as Record<string, unknown>;
  if (appId && map[appId] && typeof map[appId] === "object") return map[appId] as Record<string, unknown>;
  if (map["money-matters"] && typeof map["money-matters"] === "object") return map["money-matters"] as Record<string, unknown>;
  return map;
}

export default function MobileNotificationSettingsScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const channelStatusQuery = trpc.getNotificationChannelStatus.useQuery();
  const updatePrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      utils.getUserPreferences.invalidate();
      toast.success(t("toasts.saved"));
    },
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
  });

  const sendTestMutation = trpc.sendTestNotification.useMutation({
    onSuccess: (res) => {
      toast.success(
        t("notifications.settings.testSuccessWithDetails", {
          email: res.emailRecipient,
          count: String(res.mobilePushDeviceCount),
        })
      );
    },
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
  });

  const appId = userPrefQuery.data?.appId;
  const savedPrefs = resolvePrefsBlob(userPrefQuery.data?.appPreferences, appId);
  const isEnabled = (key: string, legacyKey: string) =>
    optimistic[key] ?? (savedPrefs[key] !== false && savedPrefs[legacyKey] !== false);

  const handleToggle = (key: string, value: boolean) => {
    if (!appId) return;
    setOptimistic((prev) => ({ ...prev, [key]: value }));
    updatePrefMutation.mutate({ appPreferences: { [appId]: { ...savedPrefs, [key]: value } } });
  };

  const topics = [
    { id: "weekly_digest", title: t("notifications.settings.weeklyDigestTitle"), desc: t("notifications.settings.weeklyDigestDesc"), emailKey: "weekly_digest_email", pushKey: "weekly_digest_push", legacyKey: "weekly_digest_enabled" },
    { id: "payday_alerts", title: t("notifications.settings.paydayTitle"), desc: t("notifications.settings.paydayDesc"), emailKey: "payday_alerts_email", pushKey: "payday_alerts_push", legacyKey: "payday_alerts_enabled" },
    { id: "balance_nudge", title: t("notifications.settings.balanceMatchTitle"), desc: t("notifications.settings.balanceMatchDesc"), emailKey: "balance_nudge_email", pushKey: "balance_nudge_push", legacyKey: "balance_nudge_enabled" },
  ];
  const status = channelStatusQuery.data;

  return (
    <MobileScreenWrapper title={t("notifications.settings.title")} user={session?.user} showBack onBackPress={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 14 }}>
        {status && (
          <View style={styles.statusBanner}>
            <Text style={styles.descText}>{t("notifications.settings.emailChannelNote", { email: status.emailRecipient })}</Text>
            <Text style={styles.statusBold}>
              {status.mobilePushDeviceCount > 0
                ? t("notifications.settings.pushDeviceStatusCount", { count: String(status.mobilePushDeviceCount) })
                : t("notifications.settings.pushDeviceStatusNone")}
            </Text>
          </View>
        )}

        {topics.map((topic) => (
          <View key={topic.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.titleText}>{topic.title}</Text>
              <Text style={styles.descText}>{topic.desc}</Text>
            </View>
            <View style={styles.matrixDivider} />
            <SwitchRow label={t("notifications.settings.emailChannel")} value={isEnabled(topic.emailKey, topic.legacyKey)} onValueChange={(val) => handleToggle(topic.emailKey, val)} />
            <SwitchRow label={t("notifications.settings.pushChannel")} value={isEnabled(topic.pushKey, topic.legacyKey)} onValueChange={(val) => handleToggle(topic.pushKey, val)} />
          </View>
        ))}

        <View style={styles.testActionContainer}>
          <MobileButton variant="secondary" title={sendTestMutation.isPending ? t("notifications.settings.sendingTest") : t("notifications.settings.sendTestButton")} onPress={() => sendTestMutation.mutate({ channel: "all" })} disabled={sendTestMutation.isPending} />
        </View>
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  statusBanner: { backgroundColor: D.colors.surface, borderRadius: D.radius.md, padding: 12, borderWidth: 1, borderColor: D.colors.border, gap: 4 },
  statusBold: { fontSize: 12, fontWeight: "600", color: D.colors.textPrimary },
  card: { backgroundColor: D.colors.surface, borderRadius: D.radius.md, padding: 16, borderWidth: 1, borderColor: D.colors.border, gap: 10 },
  cardHeader: { gap: 4 },
  titleText: { fontSize: 14, fontWeight: "700", color: D.colors.textPrimary },
  descText: { fontSize: 12, color: D.colors.textMuted, lineHeight: 16 },
  matrixDivider: { height: 1, backgroundColor: D.colors.border, marginVertical: 4 },
  testActionContainer: { paddingTop: 8 },
});
