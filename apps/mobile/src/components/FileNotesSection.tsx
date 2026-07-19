import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { trpc } from '../lib/trpc';
import { DESIGN_TOKENS } from '@money-matters/ui';

interface FileNotesSectionProps {
  entityType: string;
  entityId: string;
}

export function FileNotesSection({ entityType, entityId }: FileNotesSectionProps) {
  const [comment, setComment] = useState('');

  const notesQuery = trpc.listFileNotes.useQuery({
    entityType,
    entityId,
    status: 'ACTIVE',
  });

  const createFileNoteMutation = trpc.createFileNote.useMutation({
    onSuccess: () => {
      setComment('');
      notesQuery.refetch();
    },
  });

  const handlePost = () => {
    if (!comment.trim()) return;
    createFileNoteMutation.mutate({
      entityType,
      entityId,
      comment: comment.trim(),
    });
  };

  const notes = notesQuery.data ?? [];
  const D = DESIGN_TOKENS;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Notes & Comments</Text>

      {/* Input row */}
      <View style={styles.formRow}>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Add a note or comment..."
          placeholderTextColor={D.colors.textMuted}
        />
        <TouchableOpacity
          style={[styles.postBtn, (!comment.trim() || createFileNoteMutation.isPending) && styles.disabledBtn]}
          onPress={handlePost}
          disabled={!comment.trim() || createFileNoteMutation.isPending}
        >
          {createFileNoteMutation.isPending ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Notes list */}
      {notesQuery.isLoading ? (
        <ActivityIndicator color={D.colors.accent} style={{ marginTop: 12 }} />
      ) : notes.length === 0 ? (
        <Text style={styles.emptyNotes}>No notes added yet.</Text>
      ) : (
        <View style={styles.notesList}>
          {notes.map((n) => (
            <View key={n.id} style={styles.noteItem}>
              <Text style={styles.noteComment}>{n.comment}</Text>
              <Text style={styles.noteDate}>
                {new Date(n.createdAt).toLocaleDateString('en-AU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: D.colors.border },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 10 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: D.colors.surface, borderRadius: D.radius.md, borderWidth: 1, borderColor: D.colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: D.colors.textPrimary },
  postBtn: { backgroundColor: D.colors.accent, borderRadius: D.radius.md, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },
  postBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  emptyNotes: { fontSize: 12, color: D.colors.textMuted, fontStyle: 'italic', marginVertical: 8 },
  notesList: { gap: 8 },
  noteItem: { backgroundColor: D.colors.surface, borderRadius: D.radius.md, padding: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  noteComment: { fontSize: 13, color: D.colors.textPrimary, fontWeight: '500', marginBottom: 4 },
  noteDate: { fontSize: 10, color: D.colors.textMuted },
});
