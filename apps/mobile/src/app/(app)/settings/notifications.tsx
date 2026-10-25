import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { DESIGN_TOKENS, MobileScreenWrapper, SwitchRow, MobileButton, useMobileToast } from "@money-matters/ui/mobile";
import { t } from "@money-matters/i18n";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";

export default function MobileNotificationSettingsScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updatePrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      utils.getUserPreferences.invalidate();
      toast.success(t("toasts.saved"));
    },
    onError: (err) => {
      toast.error(err.message || t("common.errorTryAgain"));
    },
  });

  const sendTestMutation = trpc.sendTestNotification.useMutation({
    onSuccess: () => {
      toast.success(t("notifications.settings.testSuccessToast"));
    },
    onError: (err) => {
      toast.error(err.message || t("common.errorTryAgain"));
    },
  });

  const appPrefs = (userPrefQuery.data?.appPreferences || {}) as Record<string, unknown>;

  const [weeklyDigestEmail, setWeeklyDigestEmail] = useState(true);
  const [weeklyDigestPush, setWeeklyDigestPush] = useState(true);
  const [paydayAlertsEmail, setPaydayAlertsEmail] = useState(true);
  const [paydayAlertsPush, setPaydayAlertsPush] = useState(true);
  const [balanceNudgeEmail, setBalanceNudgeEmail] = useState(true);
  const [balanceNudgePush, setBalanceNudgePush] = useState(true);

  useEffect(() => {
    if (userPrefQuery.data?.appPreferences) {
      const p = userPrefQuery.data.appPreferences as Record<string, unknown>;
      setWeeklyDigestEmail(p.weekly_digest_email !== false && p.weekly_digest_enabled !== false);
      setWeeklyDigestPush(p.weekly_digest_push !== false && p.weekly_digest_enabled !== false);
      setPaydayAlertsEmail(p.payday_alerts_email !== false && p.payday_alerts_enabled !== false);
      setPaydayAlertsPush(p.payday_alerts_push !== false && p.payday_alerts_enabled !== false);
      setBalanceNudgeEmail(p.balance_nudge_email !== false && p.balance_nudge_enabled !== false);
      setBalanceNudgePush(p.balance_nudge_push !== false && p.balance_nudge_enabled !== false);
    }
  }, [userPrefQuery.data]);

  const handleToggle = (key: string, value: boolean) => {
    if (key === "weekly_digest_email") setWeeklyDigestEmail(value);
    if (key === "weekly_digest_push") setWeeklyDigestPush(value);
    if (key === "payday_alerts_email") setPaydayAlertsEmail(value);
    if (key === "payday_alerts_push") setPaydayAlertsPush(value);
    if (key === "balance_nudge_email") setBalanceNudgeEmail(value);
    if (key === "balance_nudge_push") setBalanceNudgePush(value);

    updatePrefMutation.mutate({
      appPreferences: {
        "money-matters": {
          ...appPrefs,
          [key]: value,
        },
      },
    });
  };

  const topics = [
    {
      id: "weekly_digest",
      title: t("notifications.settings.weeklyDigestTitle"),
      desc: t("notifications.settings.weeklyDigestDesc"),
      emailKey: "weekly_digest_email",
      emailVal: weeklyDigestEmail,
      pushKey: "weekly_digest_push",
      pushVal: weeklyDigestPush,
    },
    {
      id: "payday_alerts",
      title: t("notifications.settings.paydayTitle"),
      desc: t("notifications.settings.paydayDesc"),
      emailKey: "payday_alerts_email",
      emailVal: paydayAlertsEmail,
      pushKey: "payday_alerts_push",
      pushVal: paydayAlertsPush,
    },
    {
      id: "balance_nudge",
      title: t("notifications.settings.balanceMatchTitle"),
      desc: t("notifications.settings.balanceMatchDesc"),
      emailKey: "balance_nudge_email",
      emailVal: balanceNudgeEmail,
      pushKey: "balance_nudge_push",
      pushVal: balanceNudgePush,
    },
  ];

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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 14 }}>
        {topics.map((topic) => (
          <View key={topic.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.titleText}>{topic.title}</Text>
              <Text style={styles.descText}>{topic.desc}</Text>
            </View>

            <View style={styles.matrixDivider} />

            <SwitchRow
              label={t("notifications.settings.emailChannel")}
              value={topic.emailVal}
              onValueChange={(val) => handleToggle(topic.emailKey, val)}
            />

            <SwitchRow
              label={t("notifications.settings.pushChannel")}
              value={topic.pushVal}
              onValueChange={(val) => handleToggle(topic.pushKey, val)}
            />
          </View>
        ))}

        <View style={styles.testActionContainer}>
          <MobileButton
            variant="secondary"
            title={sendTestMutation.isPending ? t("notifications.settings.sendingTest") : t("notifications.settings.sendTestButton")}
            onPress={() => sendTestMutation.mutate({ channel: "all" })}
            disabled={sendTestMutation.isPending}
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
    gap: 10,
  },
  cardHeader: {
    gap: 4,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "700",
    color: D.colors.textPrimary,
  },
  descText: {
    fontSize: 12,
    color: D.colors.textMuted,
    lineHeight: 16,
  },
  matrixDivider: {
    height: 1,
    backgroundColor: D.colors.border,
    marginVertical: 4,
  },
  testActionContainer: {
    paddingTop: 8,
  },
});

