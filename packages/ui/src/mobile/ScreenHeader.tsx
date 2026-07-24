import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { t } from "@money-matters/i18n";

interface ScreenHeaderProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showProfile?: boolean;
  user?: { name?: string | null; email?: string | null } | null;
  getInitials: () => string;
  onOpenMenu: () => void;
  styles: any;
}

export function ScreenHeader({
  title,
  showBack,
  onBackPress,
  showProfile,
  user,
  getInitials,
  onOpenMenu,
  styles,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Left Area: Back Button or Branding */}
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBackPress}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>{t("common.back")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.brandContainer}>
            <Text style={styles.brandLogo}>🪙</Text>
            <Text style={styles.brandText}>{t("app.title")}</Text>
          </View>
        )}
      </View>

      {/* Middle Area: Title */}
      <View style={styles.titleContainer}>
        {title ? (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      {/* Right Area: Profile Bubble */}
      <View style={styles.rightContainer}>
        {showProfile && user ? (
          <TouchableOpacity
            onPress={onOpenMenu}
            style={styles.avatarButton}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>
    </View>
  );
}
