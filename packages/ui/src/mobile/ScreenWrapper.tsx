import React, { useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { DESIGN_TOKENS } from "../tokens";
import { ScreenHeader } from "./ScreenHeader";
import { ScreenMenuModal } from "./ScreenMenuModal";

export interface ScreenWrapperProps {
  title?: string;
  user?: { name?: string | null; email?: string | null } | null;
  showProfile?: boolean;
  showBack?: boolean;
  onBackPress?: () => void;
  onSignOut?: () => void;
  onNavigateHome?: () => void;
  onNavigateCategories?: () => void;
  onNavigateSettings?: () => void;
  children: React.ReactNode;
  scrollable?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  title,
  user,
  showProfile = true,
  showBack = false,
  onBackPress,
  onSignOut,
  onNavigateHome,
  onNavigateCategories,
  onNavigateSettings,
  children,
  scrollable = true,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const D = DESIGN_TOKENS;

  const getInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleMenuAction = (callback?: () => void) => {
    setMenuVisible(false);
    if (callback) {
      setTimeout(() => {
        callback();
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={D.colors.background}
      />
      <ScreenHeader
        title={title}
        showBack={showBack}
        onBackPress={onBackPress}
        showProfile={showProfile}
        user={user}
        getInitials={getInitials}
        onOpenMenu={() => setMenuVisible(true)}
        styles={styles}
      />

      {scrollable ? (
        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contentContainer, { flex: 1 }]}>{children}</View>
      )}

      <ScreenMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        user={user}
        getInitials={getInitials}
        handleMenuAction={handleMenuAction}
        onNavigateHome={onNavigateHome}
        onNavigateCategories={onNavigateCategories}
        onNavigateSettings={onNavigateSettings}
        onSignOut={onSignOut}
        styles={styles}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 64,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  leftContainer: {
    flex: 1.5,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  titleContainer: {
    flex: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  rightContainer: {
    flex: 1.5,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backArrow: {
    fontSize: 18,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.accent,
  },
  backText: {
    fontSize: 15,
    color: DESIGN_TOKENS.colors.accent,
    fontWeight: "500",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandLogo: {
    fontSize: 18,
  },
  brandText: {
    fontSize: 14,
    fontWeight: "800",
    color: DESIGN_TOKENS.colors.primary,
    letterSpacing: -0.2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.primary,
    textAlign: "center",
  },
  avatarButton: {
    borderRadius: 18,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: DESIGN_TOKENS.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarText: {
    color: DESIGN_TOKENS.colors.onAccent,
    fontSize: 14,
    fontWeight: "700",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.background,
  },
  scrollContent: {
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingTop: DESIGN_TOKENS.spacing.sectionGap,
    paddingBottom: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(27, 43, 75, 0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "ios" ? 80 : 64,
    paddingRight: 16,
  },
  modalContent: {
    width: 250,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  menuProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  menuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN_TOKENS.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  menuAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  menuProfileInfo: {
    flex: 1,
  },
  menuProfileName: {
    fontSize: 14,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  menuProfileEmail: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: DESIGN_TOKENS.radius.default,
    gap: 12,
  },
  menuItemIcon: {
    fontSize: 16,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  signOutMenuItem: {
    backgroundColor: "rgba(239, 68, 68, 0.04)",
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.critical,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: DESIGN_TOKENS.radius.default,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textMuted,
  },
});

export default ScreenWrapper;
