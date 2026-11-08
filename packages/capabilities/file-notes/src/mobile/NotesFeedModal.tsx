import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { MobileModalDialog, showMobileConfirm } from '@money-matters/ui/mobile';
import { useFileNotesService } from '../context.js';

export interface NotesFeedModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: 'ENVELOPE' | 'BANK_ACCOUNT';
  entityId: string;
  entityName: string;
}

export function NotesFeedModal({
  visible,
  onClose,
  entityType,
  entityId,
  entityName,
}: NotesFeedModalProps) {
  const service = useFileNotesService();
  const [noteComment, setNoteComment] = useState('');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType?: string; size?: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: notes, refetch: refetchNotes, isFetching } = service.useListQuery({
    entityType,
    entityId,
  });

  const createPresignedUrlMutation = service.useCreatePreSignedUrlMutation();
  const createNoteMutation = service.useCreateMutation();
  const purgeNoteMutation = service.usePurgeMutation();

  const isDirty = Boolean(noteComment.trim() || pickedFile);

  const handlePickDocument = async () => {
    try {
      setErrorMessage(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
          size: asset.size,
        });
      }
    } catch (err: unknown) {
      setErrorMessage(t('fileNotes.errors.pickFailed'));
    }
  };

  const handlePickImage = async () => {
    try {
      setErrorMessage(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || `receipt-${Date.now()}.jpg`;
        setPickedFile({
          uri: asset.uri,
          name: filename,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize,
        });
      }
    } catch (err: unknown) {
      setErrorMessage(t('fileNotes.errors.pickFailed'));
    }
  };

  const handlePostNote = async () => {
    if (!noteComment.trim() && !pickedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    try {
      let attachment = undefined;

      if (pickedFile) {
        const presigned = await createPresignedUrlMutation.mutateAsync({
          entityType,
          entityId,
          fileName: pickedFile.name,
          fileMimeType: pickedFile.mimeType || 'application/octet-stream',
          fileSize: pickedFile.size || 1024,
        });

        const fileBlobResponse = await fetch(pickedFile.uri);
        const blob = await fileBlobResponse.blob();

        const uploadRes = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: {
            'Content-Type': pickedFile.mimeType || 'application/octet-stream',
          },
        });

        if (!uploadRes.ok) {
          throw new Error(t('fileNotes.errors.uploadFailed'));
        }

        attachment = {
          fileKey: presigned.fileKey,
          fileName: pickedFile.name,
          fileMimeType: pickedFile.mimeType || 'application/octet-stream',
          fileSize: pickedFile.size || 1024,
        };
      }

      await createNoteMutation.mutateAsync({
        entityType,
        entityId,
        comment: noteComment.trim() || undefined,
        attachment,
      });

      setNoteComment('');
      setPickedFile(null);
      refetchNotes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('fileNotes.errors.createFailed');
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (noteId: string) => {
    try {
      const { downloadUrl } = await service.getDownloadUrl(noteId);
      await Linking.openURL(downloadUrl);
    } catch (err: unknown) {
      setErrorMessage(t('fileNotes.errors.downloadFailed'));
    }
  };

  const handleConfirmPurge = (noteId: string) => {
    showMobileConfirm({
      title: t('fileNotes.confirmPurgeTitle'),
      message: t('fileNotes.confirmPurgeDesc'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          await purgeNoteMutation.mutateAsync({ id: noteId });
          refetchNotes();
        } catch (err: unknown) {
          setErrorMessage(t('fileNotes.errors.purgeFailed'));
        }
      },
    });
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={entityName}
      subtitle={t('fileNotes.drawerSubtitle')}
      isDirty={isDirty}
    >
      <View style={styles.container}>
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Input area */}
        <View style={styles.formContainer}>
          <TextInput
            value={noteComment}
            onChangeText={setNoteComment}
            placeholder={t('fileNotes.inputPlaceholder')}
            placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
            style={styles.textInput}
            multiline
            numberOfLines={3}
          />

          {pickedFile && (
            <View style={styles.pickedFilePill}>
              <Feather name="paperclip" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
              <Text style={styles.pickedFileName} numberOfLines={1}>
                {pickedFile.name}
              </Text>
              <TouchableOpacity onPress={() => setPickedFile(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionsRow}>
            <View style={styles.attachButtons}>
              <TouchableOpacity onPress={handlePickDocument} style={styles.attachButton} activeOpacity={0.7}>
                <Feather name="file" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickImage} style={styles.attachButton} activeOpacity={0.7}>
                <Feather name="camera" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handlePostNote}
              disabled={!isDirty || isUploading}
              style={[
                styles.submitButton,
                (!isDirty || isUploading) && styles.submitButtonDisabled,
              ]}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>{t('fileNotes.addNoteButton')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes feed */}
        <ScrollView style={styles.feedScroll} showsVerticalScrollIndicator={false}>
          {(!notes || notes.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('fileNotes.emptyState')}</Text>
            </View>
          ) : (
            notes.map((note) => {
              const formattedSize = note.fileSize
                ? `${(parseInt(note.fileSize, 10) / 1024 / 1024).toFixed(2)} MB`
                : null;

              return (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View>
                      <Text style={styles.noteAuthor}>{note.creatorName}</Text>
                      <Text style={styles.noteDate}>
                        {new Date(note.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleConfirmPurge(note.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
                    </TouchableOpacity>
                  </View>

                  {note.comment && (
                    <Text style={styles.noteComment}>{note.comment}</Text>
                  )}

                  {note.fileKey && (
                    <TouchableOpacity
                      onPress={() => handleDownload(note.id)}
                      style={styles.attachmentPill}
                      activeOpacity={0.7}
                    >
                      <Feather name="paperclip" size={14} color={DESIGN_TOKENS.colors.slate[500]} />
                      <View style={styles.attachmentMeta}>
                        <Text style={styles.attachmentName} numberOfLines={1}>
                          {note.fileName}
                        </Text>
                        <Text style={styles.attachmentSize}>{formattedSize}</Text>
                      </View>
                      <Feather name="download" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
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
