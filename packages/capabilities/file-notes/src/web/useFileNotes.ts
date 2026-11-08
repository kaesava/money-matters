import { useState } from 'react';
import { useFileNotesService } from '../context.js';
import { t } from '@money-matters/i18n';

export function useFileNotes(entityType: 'ENVELOPE' | 'BANK_ACCOUNT', entityId?: string) {
  const service = useFileNotesService();
  const [isUploadingNote, setIsUploadingNote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: notes, refetch: refetchNotes, isFetching } = service.useListQuery({
    entityType,
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
    setErrorMessage(null);
    try {
      let attachment = undefined;

      if (noteFile) {
        const presigned = await createPresignedUrlMutation.mutateAsync({
          entityType,
          entityId,
          fileName: noteFile.name,
          fileMimeType: noteFile.type || 'application/octet-stream',
          fileSize: noteFile.size,
        });

        const uploadResponse = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          body: noteFile,
          headers: {
            'Content-Type': noteFile.type || 'application/octet-stream',
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(t('fileNotes.errors.uploadFailed'));
        }

        attachment = {
          fileKey: presigned.fileKey,
          fileName: noteFile.name,
          fileMimeType: noteFile.type || 'application/octet-stream',
          fileSize: noteFile.size,
        };
      }

      await createNoteMutation.mutateAsync({
        entityType,
        entityId,
        comment: noteComment.trim() || undefined,
        attachment,
      });

      refetchNotes();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('fileNotes.errors.createFailed');
      setErrorMessage(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('fileNotes.errors.updateFailed');
      setErrorMessage(msg);
    }
  };

  const handleArchiveNote = async (noteId: string) => {
    try {
      await archiveNoteMutation.mutateAsync({ id: noteId });
      refetchNotes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('fileNotes.errors.archiveFailed');
      setErrorMessage(msg);
    }
  };

  const handlePurgeNote = async (noteId: string) => {
    try {
      await purgeNoteMutation.mutateAsync({ id: noteId });
      refetchNotes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('fileNotes.errors.purgeFailed');
      setErrorMessage(msg);
    }
  };

  const downloadNote = async (noteId: string) => {
    try {
      const { downloadUrl } = await service.getDownloadUrl(noteId);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('fileNotes.errors.downloadFailed');
      setErrorMessage(msg);
    }
  };

  return {
    notes,
    isFetching,
    isUploadingNote,
    errorMessage,
    clearError: () => setErrorMessage(null),
    handleCreateNote,
    handleSaveCommentEdit,
    handleArchiveNote,
    handlePurgeNote,
    downloadNote,
  };
}
