import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, Image, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "../tokens";
import { showMobileConfirm } from "./MobileConfirmDialog";

interface ScreenMenuModalProps {
  visible: boolean;
  onClose: () => void;
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  getInitials: () => string;
  handleMenuAction: (callback?: () => void) => void;
  onNavigateHome?: () => void;
  onNavigateCategories?: () => void;
  onNavigateSettings?: () => void;
  onNavigateBankAccounts?: () => void;
  onNavigateHistory?: () => void;
  onOpenTenantSwitcher?: () => void;
  hasMultipleTenants?: boolean;
  activeTenantName?: string;
  onSignOut?: () => void;
  styles: Record<string, ViewStyle | TextStyle | ImageStyle>;
}

export function ScreenMenuModal({
  visible,
  onClose,
  user,
  getInitials,
  handleMenuAction,
  onNavigateHome,
  onNavigateCategories,
  onNavigateSettings,
  onNavigateBankAccounts,
  onNavigateHistory,
  onOpenTenantSwitcher,
  hasMultipleTenants,
  activeTenantName,
  onSignOut,
  styles,
}: ScreenMenuModalProps) {
  const D = DESIGN_TOKENS;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          {/* User Profile Card Header */}
          <View style={styles.menuProfileHeader}>
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.menuAvatar as ImageStyle} />
            ) : (
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>{getInitials()}</Text>
              </View>
            )}
            <View style={styles.menuProfileInfo}>
              <Text style={styles.menuProfileName} numberOfLines={1}>
                {user?.name || t("common.user")}
              </Text>
              <Text style={styles.menuProfileEmail} numberOfLines={1}>
                {user?.email || ""}
              </Text>
              {activeTenantName ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Text style={{ fontSize: 11 }}>🏡</Text>
                  <Text
                    style={{ fontSize: 11, fontWeight: "600", color: D.colors.primary }}
                    numberOfLines={1}
                  >
                    {activeTenantName}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.menuDivider} />

          {/* Change Household (only if user belongs to >1 household or callback provided) */}
          {hasMultipleTenants && onOpenTenantSwitcher && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction(onOpenTenantSwitcher)}
            >
              <Feather name="refresh-cw" size={16} color={D.colors.textPrimary} />
              <Text style={styles.menuItemText}>{t("tenantSwitcher.label")}</Text>
            </TouchableOpacity>
          )}

          {/* Bank Accounts */}
          {onNavigateBankAccounts && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction(onNavigateBankAccounts)}
            >
              <Feather name="credit-card" size={16} color={D.colors.textPrimary} />
              <Text style={styles.menuItemText}>{t("nav.bankAccounts", { defaultValue: "Bank Accounts" })}</Text>
            </TouchableOpacity>
          )}

          {/* History */}
          {onNavigateHistory && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction(onNavigateHistory)}
            >
              <Feather name="clock" size={16} color={D.colors.textPrimary} />
              <Text style={styles.menuItemText}>{t("nav.history", { defaultValue: "History" })}</Text>
            </TouchableOpacity>
          )}

          {/* Settings */}
          {onNavigateSettings && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction(onNavigateSettings)}
            >
              <Feather name="settings" size={16} color={D.colors.textPrimary} />
              <Text style={styles.menuItemText}>{t("nav.settings")}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.menuDivider} />

          {/* Guarded Sign Out with showMobileConfirm */}
          {onSignOut && (
            <TouchableOpacity
              style={[styles.menuItem, styles.signOutMenuItem]}
              onPress={() => {
                onClose();
                showMobileConfirm({
                  title: t("settings.signOut"),
                  message: t("settings.signOutConfirm"),
                  confirmText: t("settings.signOut"),
                  cancelText: t("common.cancel"),
                  isDestructive: true,
                  onConfirm: onSignOut,
                });
              }}
            >
              <Feather name="log-out" size={16} color={D.colors.critical} />
              <Text style={styles.signOutText}>{t("settings.signOut")}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>{t("common.close")}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
