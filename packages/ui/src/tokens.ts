/**
 * Monorepo UI Design System Tokens
 * 
 * Centralized design tokens governing palette colors (brand navy, serene blue, teal accent, traffic light status),
 * border radii, and spatial layouts across Web and React Native Mobile applications.
 */
export const DESIGN_TOKENS = {
  colors: {
    // Brand Colors
    primary: "#1B2B4B",     // Deep Navy
    primaryHover: "#1d4ed8",// Blue 700
    onPrimary: "#FFFFFF",
    sereneBlue: "#2563eb",  // Serene Blue
    accent: "#2563eb",      // Serene Blue (standardized)
    onAccent: "#FFFFFF",
    
    // Slate Palette
    slate: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#0F172A",
    },

    // Status Pairs
    success: "#22C55E",
    successLight: "#ECFDF5",
    successBorder: "#A7F3D0",
    successDark: "#047857",

    warning: "#F59E0B",
    warningLight: "#FFFBEB",
    warningBorder: "#FDE68A",
    warningDark: "#92400E",

    critical: "#EF4444",
    criticalLight: "#FEF2F2",
    criticalBorder: "#FECDD3",
    criticalDark: "#B91C1C",
    burnRed: "#ba1a1a",

    accentLight: "#EFF6FF",
    accentBorder: "#BFDBFE",
    accentDark: "#1E40AF",

    // Surfaces & Neutral Roles
    background: "#F7F8FA",
    surface: "#FFFFFF",
    surfaceVariant: "#F3F4F6",
    cardBg: "#FFFFFF",
    cardBorder: "#E2E8F0",
    border: "#E5E7EB",
    divider: "#F1F5F9",
    textPrimary: "#1B2B4B",
    textMuted: "#64748B",
    subtleText: "#94A3B8",
  },
  radius: {
    sm: 4,
    default: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999
  },
  spacing: {
    containerMargin: 20,
    stackGap: 12,
    cardPadding: 16,
    sectionGap: 24
  },
  fonts: {
    heading: "Serene Finance",
    body: "Inter",
    mono: "JetBrains Mono, monospace"
  }
} as const;
