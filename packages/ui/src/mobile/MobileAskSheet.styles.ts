import { StyleSheet } from "react-native";
import { DESIGN_TOKENS } from "../tokens";

export const styles = StyleSheet.create({
  scrollContent: {
    gap: 14,
    paddingVertical: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  resultBox: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 10,
    padding: 12,
  },
  resultText: {
    fontSize: 13,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.textPrimary,
    lineHeight: 18,
  },
  clarifyBox: {
    gap: 8,
  },
  clarifyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[700],
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  suggestionText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[700],
  },
  unavailableText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.warningDark,
  },
  sectionGap: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: "uppercase",
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
  footerHelpText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    textAlign: "center",
    marginTop: 4,
  },
});
