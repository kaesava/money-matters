import React, { useState, useRef, useId } from 'react';
import { Paperclip, Download, Trash2, Edit2, X, Plus } from 'lucide-react';
import { t } from '@money-matters/i18n';
import { useFileNotes } from './useFileNotes.js';
import { SlideOverDrawer, ConfirmDialog, FormErrorBanner, Button } from '@money-matters/ui/web';

export interface FileNotesPanelProps {
  entityType: 'ENVELOPE' | 'BANK_ACCOUNT';
  entityId: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function FileNotesPanel({ entityType, entityId, onDirtyChange }: FileNotesPanelProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [noteComment, setNoteComment] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [purgingNoteId, setPurgingNoteId] = useState<string | null>(null);

  const {
    notes,
    isUploadingNote,
    errorMessage,
    clearError,
    handleCreateNote,
    handleSaveCommentEdit,
    handleArchiveNote,
    handlePurgeNote,
    downloadNote,
  } = useFileNotes(entityType, entityId);

  const isFormDirty = Boolean(noteComment.trim() || noteFile);
  React.useEffect(() => {
    onDirtyChange?.(isFormDirty);
  }, [isFormDirty, onDirtyChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateNote(noteComment, noteFile, () => {
      setNoteComment('');
      setNoteFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    if (e.target.files && e.target.files[0]) {
      setNoteFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setNoteFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div className="flex flex-col h-full space-y-6">
          {errorMessage && (
            <FormErrorBanner message={errorMessage} onDismiss={clearError} />
          )}

          {/* New Note / Upload Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
            <textarea
              value={noteComment}
              onChange={(e) => setNoteComment(e.target.value)}
              placeholder={t('fileNotes.inputPlaceholder')}
              className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 outline-none focus:border-sereneBlue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 resize-none min-h-[64px]"
            />

            {noteFile && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <Paperclip className="w-3.5 h-3.5 text-sereneBlue shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {noteFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                      {(noteFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{t('fileNotes.attachFile')}</span>
              </button>

              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={!isFormDirty || isUploadingNote}
                loading={isUploadingNote}
              >
                {t('fileNotes.addNoteButton')}
              </Button>
            </div>
          </form>

          {/* Notes Feed */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {(!notes || notes.length === 0) ? (
              <div className="text-center text-slate-400 text-xs py-16">
                {t('fileNotes.emptyState')}
              </div>
            ) : (
              notes.map((note) => {
                const isEditing = editingNoteId === note.id;
                const formattedSize = note.fileSize
                  ? `${(parseInt(note.fileSize, 10) / 1024 / 1024).toFixed(2)} MB`
                  : null;

                return (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          {note.creatorName}
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingCommentText(note.comment || '');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title={t('common.edit')}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPurgingNoteId(note.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Comment Body */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 p-2 outline-none focus:border-sereneBlue dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 resize-none min-h-[48px]"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-2.5 py-1 text-[10px] font-medium border rounded bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSaveCommentEdit(note.id, editingCommentText);
                              setEditingNoteId(null);
                            }}
                            className="px-2.5 py-1 text-[10px] font-medium rounded bg-sereneBlue text-white hover:bg-blue-600"
                          >
                            {t('common.save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      note.comment && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {note.comment}
                        </p>
                      )
                    )}

                    {/* File Attachment Pill */}
                    {note.fileKey && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {note.fileName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                              {formattedSize} • {note.fileMimeType}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => downloadNote(note.id)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                          title={t('fileNotes.downloadAttachment')}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      <ConfirmDialog
        isOpen={Boolean(purgingNoteId)}
        title={t('fileNotes.confirmPurgeTitle')}
        description={t('fileNotes.confirmPurgeDesc')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => {
          if (purgingNoteId) {
            handlePurgeNote(purgingNoteId);
            setPurgingNoteId(null);
          }
        }}
        onClose={() => setPurgingNoteId(null)}
      />
    </>
  );
}

export interface FileNotesDrawerProps {
  entityType: 'ENVELOPE' | 'BANK_ACCOUNT';
  entity: { id: string; name: string } | null;
  onClose: () => void;
  onBack?: () => void;
}

export function FileNotesDrawer({ entityType, entity, onClose, onBack }: FileNotesDrawerProps) {
  const [isDirty, setIsDirty] = useState(false);
  if (!entity) return null;

  return (
    <SlideOverDrawer
      title={t('fileNotes.drawerTitle', { entityName: entity.name })}
      subtitle={t('fileNotes.drawerSubtitle')}
      onClose={onClose}
      onBack={onBack}
      isDirty={isDirty}
      widthClass="max-w-lg"
    >
      <FileNotesPanel
        entityType={entityType}
        entityId={entity.id}
        onDirtyChange={setIsDirty}
      />
    </SlideOverDrawer>
  );
}
