export const fileNotes = {
  fileNotes: {
    title: "Notes",
    drawerTitle: "Notes & Files: {entityName}",
    drawerSubtitle: "Attach documents, receipts, and notes",
    inputPlaceholder: "Write a note or attach a file...",
    attachFile: "Attach file",
    addNoteButton: "Add Note",
    emptyState: "No notes or files attached yet.",
    downloadAttachment: "Download attachment",
    confirmPurgeTitle: "Delete File Note",
    confirmPurgeDesc: "This will permanently delete this note and its attachment. This cannot be undone.",
    errors: {
      uploadFailed: "Failed to upload file to storage.",
      createFailed: "Failed to create note.",
      updateFailed: "Failed to update note comment.",
      archiveFailed: "Failed to archive note.",
      purgeFailed: "Failed to delete note.",
      downloadFailed: "Failed to download file.",
      pickFailed: "Failed to select file.",
    },
  },
} as const;
