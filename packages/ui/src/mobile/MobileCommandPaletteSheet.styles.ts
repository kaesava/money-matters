import { StyleSheet } from "react-native";
import { DESIGN_TOKENS } from "../tokens";

export const styles = StyleSheet.create({
  container: {
    maxHeight: 520,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: DESIGN_TOKENS.colors.slate[900],
    padding: 0,
  },
  categoryScroll: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  categoryPillActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.slate[600],
  },
  categoryPillTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 16,
  },
  aiAskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  aiAskIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiAskTextContainer: {
    flex: 1,
  },
  aiAskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  aiAskSubtitle: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 2,
  },
  aiResultBox: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  aiResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiHeaderTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiResultHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  aiResultText: {
    fontSize: 14,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.slate[800],
    lineHeight: 20,
  },
  clarifyBox: {
    gap: 8,
  },
  clarifyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[700],
    fontWeight: "500",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  suggestionText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[700],
  },
  unavailableText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.critical,
  },
  sectionContainer: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.slate[800],
  },
  rowSubtitle: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 1,
  },
  rowAmount: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "monospace",
    color: DESIGN_TOKENS.colors.slate[800],
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.slate[700],
  },
  emptySubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  suggestedContainer: {
    gap: 8,
  },
  suggestedHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[700],
  },
  footerBar: {
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[200],
    paddingTop: 8,
    marginTop: 8,
    alignItems: "flex-end",
  },
  footerCallsText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
  },
});

