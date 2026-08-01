import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS, MobileScreenWrapper } from "@money-matters/ui";
import { authClient } from "../../lib/auth";
import { trpc, setActiveSessionToken } from "../../lib/trpc";

import * as SecureStore from "expo-secure-store";

export default function SettingsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      t("settings.signOut", { defaultValue: "Sign Out" }),
      t("settings.signOutConfirm", { defaultValue: "Are you sure you want to sign out?" }),
      [
        { text: t("common.cancel", { defaultValue: "Cancel" }), style: "cancel" },
        {
          text: t("settings.signOut", { defaultValue: "Sign Out" }),
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await authClient.signOut();
              await SecureStore.deleteItemAsync("money-matters_session_token");
              await SecureStore.deleteItemAsync("money-matters-session-token");
              setActiveSessionToken(null);
              // Reset navigation to the authentication flow
              router.replace("/(auth)/sign-in");
            } catch (err) {
              Alert.alert(
                t("common.error", { defaultValue: "Error" }),
                err instanceof Error ? err.message : String(err)
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  const inviteMutation = trpc.invitePartner.useMutation();

  const handleInvitePartner = async () => {
    if (!partnerEmail.trim() || !partnerEmail.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid partner email address.");
      return;
    }
    setPartnerInviting(true);
    setInviteSuccessMsg(null);
    try {
      const res = await inviteMutation.mutateAsync({ email: partnerEmail.trim() });
      setInviteSuccessMsg(`Invite link created! Share token: ${res.inviteToken}`);
      setPartnerEmail("");
    } catch (err) {
      Alert.alert("Invite Error", err instanceof Error ? err.message : "Failed to generate partner invite.");
    } finally {
      setPartnerInviting(false);
    }
  };

  return (
    <MobileScreenWrapper
      title={t("settings.title")}
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
      onSignOut={handleSignOut}
    >
      {session?.user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("settings.profile", { defaultValue: "Profile" })}</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.nameText}>{session.user.name}</Text>
                <Text style={styles.emailText}>{session.user.email}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Partner Collaboration MVP Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Partner Collaboration</Text>
        <View style={styles.card}>
          <Text style={styles.partnerTitle}>Invite Partner to Household</Text>
          <Text style={styles.partnerSub}>Give your partner full shared read/write access to your household budgets and allocation waterfall.</Text>
          <TextInput
            style={styles.partnerInput}
            placeholder="partner@example.com"
            placeholderTextColor="#9CA3AF"
            value={partnerEmail}
            onChangeText={setPartnerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.partnerBtn, partnerInviting && styles.disabledButton]}
            onPress={handleInvitePartner}
            disabled={partnerInviting}
          >
            <Text style={styles.partnerBtnText}>{partnerInviting ? "Inviting..." : "✉️ Send Partner Invite"}</Text>
          </TouchableOpacity>
          {inviteSuccessMsg && (
            <Text style={styles.inviteSuccessText}>{inviteSuccessMsg}</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.manage", { defaultValue: "Manage" })}</Text>
        <View style={styles.cardList}>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push('/(app)/setup' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.listItemText}>⚙️ Re-run Budget Setup</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
          <View style={styles.listItemDivider} />
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push('/(app)/settings/notifications' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.listItemText}>🔔 Notification Preferences</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
          <View style={styles.listItemDivider} />
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push('/(app)/settings/income')}
            activeOpacity={0.7}
          >
            <Text style={styles.listItemText}>💸 {t("settings.incomeStreams", { defaultValue: "Income Streams" })}</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
          <View style={styles.listItemDivider} />
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push('/(app)/settings/archived' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.listItemText}>📦 Archived Items</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
          <View style={styles.listItemDivider} />
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push('/(app)/settings/bank-accounts' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.listItemText}>🏦 {t("settings.bankAccounts.title")}</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
          <View style={styles.listItemDivider} />
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push('/(app)/settings/privacy' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.listItemText}>🔒 Privacy & Data Security</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.signOutButton, loading && styles.disabledButton]}
          onPress={handleSignOut}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <Text style={styles.signOutText}>{t("settings.signOut")}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>
          {t("settings.version", { version: "1.0.0" })}
        </Text>
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.background,
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingTop: 64,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: DESIGN_TOKENS.colors.onAccent,
    fontSize: 20,
    fontWeight: "600",
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  emailText: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  signOutButton: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: DESIGN_TOKENS.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  signOutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 24,
  },
  versionText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  cardList: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  chevron: {
    fontSize: 16,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: "bold",
  },
  listItemDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  partnerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  partnerSub: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  partnerInput: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 10,
  },
  partnerBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  partnerBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  inviteSuccessText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.success,
  },
});
