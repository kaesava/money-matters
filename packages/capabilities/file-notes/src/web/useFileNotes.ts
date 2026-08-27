import { useState } from 'react';
import { useFileNotesService } from '../context.js';
import { useToast } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

export function useFileNotes(entityType: string, entityId?: string) {
  const service = useFileNotesService();
  const [isUploadingNote, setIsUploadingNote] = useState(false);

  let toast: ReturnType<typeof useToast> | null = null;
  try {
    toast = useToast();
  } catch {
    // Fallback if rendered outside ToastProvider
  }

  const { data: notes, refetch: refetchNotes } = service.useListQuery({
    entityType: entityType.toUpperCase(),
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
          entityType: entityType.toUpperCase(),
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
        entityType: entityType.toUpperCase(),
        entityId: entityId,
        comment: noteComment.trim() || undefined,
        attachment,
      });

      refetchNotes();
      toast?.success(t('fileNotes.noteAddedSuccess'));
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : t('common.error');
      toast?.error(text);
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
      toast?.success(t('fileNotes.noteUpdatedSuccess'));
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : t('common.error');
      toast?.error(text);
    }
  };

  const handleArchiveNote = async (noteId: string) => {
    try {
      await archiveNoteMutation.mutateAsync({ id: noteId });
      refetchNotes();
      toast?.success(t('fileNotes.noteArchivedSuccess'));
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : t('common.error');
      toast?.error(text);
    }
  };

  const handlePurgeNote = async (noteId: string) => {
    try {
      await purgeNoteMutation.mutateAsync({ id: noteId });
      refetchNotes();
      toast?.success(t('fileNotes.noteDeletedSuccess'));
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : t('common.error');
      toast?.error(text);
    }
  };

  const downloadNote = async (noteId: string) => {
    try {
      const { downloadUrl } = await service.getDownloadUrl(noteId);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to download file note', err);
    }
  };

  return {
    notes,
    isUploadingNote,
    handleCreateNote,
    handleSaveCommentEdit,
    handleArchiveNote,
    handlePurgeNote,
    downloadNote,
  };
}
