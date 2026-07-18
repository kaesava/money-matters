export const DESIGN_TOKENS = {
  colors: {
    // Brand Colors
    primary: "#1B2B4B",     // Deep Navy
    onPrimary: "#FFFFFF",
    accent: "#00B4A6",      // Warm Teal
    onAccent: "#FFFFFF",
    
    // Surface Colors
    background: "#F7F8FA",  // Soft off-white
    surface: "#FFFFFF",     // White for containers/cards
    surfaceVariant: "#F3F4F6",
    
    // Status (Traffic Light Colors)
    success: "#22C55E",     // Green (On Track / Income)
    warning: "#F59E0B",     // Amber (At Risk)
    critical: "#EF4444",    // Red (Underfunded / Expense)

    // Neutral Text Colors
    textPrimary: "#1B2B4B",
    textMuted: "#6B7280"
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
  }
} as const;
