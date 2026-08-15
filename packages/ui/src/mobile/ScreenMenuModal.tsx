import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "../tokens";

interface ScreenMenuModalProps {
  visible: boolean;
  onClose: () => void;
  user?: { name?: string | null; email?: string | null } | null;
  getInitials: () => string;
  handleMenuAction: (callback?: () => void) => void;
  onNavigateHome?: () => void;
  onNavigateCategories?: () => void;
  onNavigateSettings?: () => void;
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
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>{getInitials()}</Text>
            </View>
            <View style={styles.menuProfileInfo}>
              <Text style={styles.menuProfileName} numberOfLines={1}>
                {user?.name || t("common.user")}
              </Text>
              <Text style={styles.menuProfileEmail} numberOfLines={1}>
                {user?.email || ""}
              </Text>
            </View>
          </View>

          <View style={styles.menuDivider} />

          {onNavigateHome && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction(onNavigateHome)}
            >
              <Feather name="home" size={16} color={D.colors.textPrimary} />
              <Text style={styles.menuItemText}>{t("nav.home")}</Text>
            </TouchableOpacity>
          )}

          {onNavigateCategories && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction(onNavigateCategories)}
            >
              <Feather name="grid" size={16} color={D.colors.textPrimary} />
              <Text style={styles.menuItemText}>{t("nav.categories")}</Text>
            </TouchableOpacity>
          )}

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

          {onSignOut && (
            <TouchableOpacity
              style={[styles.menuItem, styles.signOutMenuItem]}
              onPress={() => handleMenuAction(onSignOut)}
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
