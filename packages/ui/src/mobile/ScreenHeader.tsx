import React from "react";
import { View, Text, TouchableOpacity, Image, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "../tokens";

import { InfoTooltip } from "./InfoTooltip";

interface ScreenHeaderProps {
  title?: string;
  infoTooltip?: { title?: string; content: string };
  showBack?: boolean;
  onBackPress?: () => void;
  onNavigateHome?: () => void;
  showProfile?: boolean;
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  getInitials: () => string;
  onOpenMenu: () => void;
  styles: Record<string, ViewStyle | TextStyle | ImageStyle>;
}

export function ScreenHeader({
  title,
  infoTooltip,
  showBack,
  onBackPress,
  onNavigateHome,
  showProfile = true,
  user,
  getInitials,
  onOpenMenu,
  styles,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Left Area: Back Button or Clickable Money Matters Home Link */}
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
          <TouchableOpacity
            onPress={onNavigateHome}
            disabled={!onNavigateHome}
            style={styles.brandContainer}
            activeOpacity={0.7}
          >
            <Text style={styles.brandText}>{t("app.title")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Middle Area: Title & InfoTooltip */}
      <View style={styles.titleContainer}>
        {title ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%", justifyContent: "center" }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {infoTooltip && (
              <InfoTooltip title={infoTooltip.title} content={infoTooltip.content} />
            )}
          </View>
        ) : null}
      </View>

      {/* Right Area: Person / Profile Icon */}
      <View style={styles.rightContainer}>
        {showProfile ? (
          <TouchableOpacity
            onPress={onOpenMenu}
            style={styles.avatarButton}
            activeOpacity={0.8}
          >
            {user?.image ? (
              <Image
                source={{ uri: user.image }}
                style={[styles.avatar as ImageStyle, { borderWidth: 1.5, borderColor: '#FFFFFF' }]}
              />
            ) : (
              <View style={styles.avatar}>
                {user?.name ? (
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                ) : (
                  <Feather name="user" size={18} color={DESIGN_TOKENS.colors.onAccent} />
                )}
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>
    </View>
  );
}
