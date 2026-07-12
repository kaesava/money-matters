import { useState } from 'react';
import { useFileNotesService } from '../context.js';
import { logger } from '@money-matters/core';

export function useFileNotes(entityType: string, entityId?: string) {
  const service = useFileNotesService();
  const [isUploadingNote, setIsUploadingNote] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const mappedType =
    entityType.toUpperCase() === 'EXPENSES' || entityType.toUpperCase() === 'EXPENSE'
      ? 'EXPENSE'
      : entityType.toUpperCase() === 'CATEGORIES' || entityType.toUpperCase() === 'CATEGORY'
      ? 'CATEGORY'
      : entityType;

  const { data: notes, refetch: refetchNotes } = service.useListQuery({
    entityType: mappedType,
    entityId: entityId || '',
  });

  const createPresignedUrlMutation = service.useCreatePreSignedUrlMutation();
  const createNoteMutation = service.useCreateMutation();
  const updateNoteCommentMutation = service.useUpdateCommentMutation();
  const archiveNoteMutation = service.useArchiveMutation();
  const purgeNoteMutation = service.usePurgeMutation();

  const handleCreateNote = async (
    noteComment: string,
    noteFile: File | null,
    onSuccess?: () => void
  ) => {
    if (!entityId) return;
    if (!noteComment.trim() && !noteFile) return;

    setIsUploadingNote(true);
    try {
      let attachment = undefined;

      if (noteFile) {
        const presigned = await createPresignedUrlMutation.mutateAsync({
          entityType: mappedType,
          entityId: entityId,
          fileName: noteFile.name,
          fileMimeType: noteFile.type,
          fileSize: noteFile.size,
        });

        const uploadResponse = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          body: noteFile,
          headers: {
            'Content-Type': noteFile.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('File upload failed');
        }

        attachment = {
          fileKey: presigned.fileKey,
          fileName: noteFile.name,
          fileMimeType: noteFile.type,
          fileSize: noteFile.size,
        };
      }

      await createNoteMutation.mutateAsync({
        entityType: mappedType,
        entityId: entityId,
        comment: noteComment.trim() || undefined,
        attachment,
      });

      refetchNotes();
      setToastMessage({ type: 'success', text: 'Note added successfully' });
      setTimeout(() => setToastMessage(null), 3000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to create note' });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsUploadingNote(false);
    }
  };

  const handleSaveCommentEdit = async (noteId: string, comment: string) => {
    if (!comment.trim()) return;
    try {
      await updateNoteCommentMutation.mutateAsync({
        id: noteId,
        comment: comment.trim(),
      });
      refetchNotes();
      setToastMessage({ type: 'success', text: 'Note updated successfully' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to update note' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleArchiveNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to archive this note?')) return;
    try {
      await archiveNoteMutation.mutateAsync({ id: noteId });
      refetchNotes();
      setToastMessage({ type: 'success', text: 'Note archived successfully' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to archive note' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handlePurgeNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to permanently delete this note and its file?')) return;
    try {
      await purgeNoteMutation.mutateAsync({ id: noteId });
      refetchNotes();
      setToastMessage({ type: 'success', text: 'Note permanently deleted' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to purge note' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const downloadNote = async (noteId: string) => {
    try {
      const { downloadUrl } = await service.getDownloadUrl(noteId);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      logger.error('Failed to download file note', err as any);
    }
  };

  return {
    notes,
    isUploadingNote,
    toastMessage,
    handleCreateNote,
    handleSaveCommentEdit,
    handleArchiveNote,
    handlePurgeNote,
    downloadNote,
  };
}
