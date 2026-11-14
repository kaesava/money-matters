import { StyleSheet } from "react-native";
import { DESIGN_TOKENS } from "@money-matters/ui";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.critical,
  },
  formContainer: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginBottom: 16,
  },
  textInput: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[900],
    minHeight: 56,
    textAlignVertical: 'top',
  },
  pickedFilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginTop: 8,
    gap: 8,
  },
  pickedFileName: {
    flex: 1,
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[800],
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[200],
  },
  attachButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  attachButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  submitButton: {
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  feedScroll: {
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  noteDate: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 1,
  },
  noteComment: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[700],
    lineHeight: 18,
    marginBottom: 8,
  },
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 8,
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  attachmentSize: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 1,
  },
});

