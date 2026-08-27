import React, { useState } from 'react';
import { Paperclip, Download, Trash2, Edit2, Archive, AlertTriangle } from 'lucide-react';
import { t } from '@money-matters/i18n';
import { useFileNotes } from './useFileNotes';
import { SlideOverDrawer } from '@money-matters/ui/web';

export interface FileNoteEntity {
  id: string;
  name?: string;
  title?: string;
  createdBy?: string;
}

export interface FileNoteItem {
  id: string;
  comment?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  fileKey?: string | null;
  fileMimeType?: string | null;
  createdBy?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface FileNotesDrawerProps {
  entityType: 'CATEGORY' | 'TRANSACTION' | 'INCOME_SOURCE' | 'BANK_ACCOUNT' | string;
  entity: FileNoteEntity | null;
  onClose: () => void;
  onBack?: () => void;
}

export function FileNotesDrawer({ entityType, entity, onClose, onBack }: FileNotesDrawerProps) {
  const [noteComment, setNoteComment] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [confirmingPurgeId, setConfirmingPurgeId] = useState<string | null>(null);

  const {
    notes,
    isUploadingNote,
    handleCreateNote,
    handleSaveCommentEdit,
    handleArchiveNote,
    handlePurgeNote,
    downloadNote,
  } = useFileNotes(entityType, entity?.id);

  if (!entity) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateNote(noteComment, noteFile, () => {
      setNoteComment('');
      setNoteFile(null);
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    });
  };

  const typedNotes = ((notes || []) as unknown) as FileNoteItem[];

  const renderFileNotesFeed = () => {
    if (typedNotes.length === 0) {
      return <div className="text-center text-gray-500 text-xs py-12">{t('fileNotes.empty')}</div>;
    }
    return typedNotes.map((note: FileNoteItem) => {
      const isEditing = editingNoteId === note.id;
      const isConfirmingPurge = confirmingPurgeId === note.id;
      const formattedSize = note.fileSize 
        ? `${(parseInt(note.fileSize, 10) / 1024 / 1024).toFixed(2)} MB`
        : '';

      const renderCommentContent = () => {
        if (isEditing) {
          return (
            <div className="space-y-2">
              <textarea
                value={editingCommentText}
                onChange={(e) => setEditingCommentText(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-200 bg-gray-50 p-2 outline-none focus:border-[#1B2B4B] resize-none min-h-[50px]"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingNoteId(null)}
                  className="px-2.5 py-1 text-[10px] font-bold border rounded bg-white text-gray-600 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveCommentEdit(note.id, editingCommentText);
                    setEditingNoteId(null);
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold rounded bg-[#1B2B4B] text-white hover:bg-[#2563eb]"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          );
        }
        if (note.comment) {
          return <p className="text-xs text-[#1B2B4B] whitespace-pre-wrap">{note.comment}</p>;
        }
        return null;
      };

      return (
        <div key={note.id} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('common.user')}: {note.createdBy || 'System'}
              </span>
              <span className="block text-[9px] text-gray-400">
                {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
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
                  className="text-[10px] font-bold text-gray-500 hover:text-[#1B2B4B] p-1 rounded"
                  title={t('common.edit')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleArchiveNote(note.id)}
                className="text-[10px] font-bold text-gray-500 hover:text-rose-600 p-1 rounded"
                title={t('common.archive')}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingPurgeId(note.id)}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 p-1 rounded"
                title={t('common.delete')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inline Purge Confirmation */}
          {isConfirmingPurge && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{t('fileNotes.confirmDeleteTitle')}</span>
              </div>
              <p className="text-[11px] text-rose-700">{t('fileNotes.confirmDeleteDesc')}</p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingPurgeId(null)}
                  className="px-2 py-1 text-[10px] font-bold bg-white border border-rose-200 rounded text-rose-700 hover:bg-rose-100"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePurgeNote(note.id);
                    setConfirmingPurgeId(null);
                  }}
                  className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          )}

          {renderCommentContent()}

          {note.fileKey ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#F7F8FA] border border-gray-200">
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-[#1B2B4B] truncate" title={note.fileName || ''}>
                    {note.fileName}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formattedSize} • {note.fileMimeType}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => downloadNote(note.id)}
                className="p-1.5 rounded bg-white border border-gray-200 hover:bg-gray-50 text-[#1B2B4B]"
                title={t('fileNotes.downloadAttachment')}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      );
    });
  };

  return (
    <SlideOverDrawer
      title={`${t('fileNotes.title')}: ${entity.name || entity.title || ''}`}
      onClose={onClose}
      onBack={onBack}
      widthClass="max-w-md"
    >
      <div className="p-6 space-y-6 bg-[#F7F8FA] min-h-full">
        {/* File & Note Creation Form */}
        <form onSubmit={onSubmit} className="space-y-4 ui-card p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold text-[#1B2B4B]">{t('fileNotes.addNote')}</h3>
          
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">{t('fileNotes.comment')}</label>
            <textarea
              value={noteComment}
              onChange={(e) => setNoteComment(e.target.value)}
              placeholder={t('fileNotes.placeholder')}
              className="w-full text-sm rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-[#1B2B4B] transition-all min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">{t('fileNotes.attachment')}</label>
            <input
              id="file-upload-input"
              type="file"
              onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1B2B4B] file:text-white hover:file:bg-[#2563eb] cursor-pointer"
            />
            <p className="text-[10px] text-gray-400">
              {t('fileNotes.fileLimitNotice')}
            </p>
          </div>

          <button
            type="submit"
            disabled={isUploadingNote || (!noteComment.trim() && !noteFile)}
            className="w-full py-2.5 text-xs font-bold rounded-xl bg-[#1B2B4B] text-white hover:bg-[#2563eb] disabled:opacity-50 transition-colors"
          >
            {isUploadingNote ? t('fileNotes.posting') : t('fileNotes.post')}
          </button>
        </form>

        {/* List of Files & Notes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#1B2B4B] border-b pb-2 border-gray-200 flex items-center justify-between">
            <span>{t('fileNotes.notesHistory')}</span>
            <span className="text-[10px] text-gray-400 font-normal">
              {typedNotes.length}
            </span>
          </h3>
          
          <div className="space-y-4">
            {renderFileNotesFeed()}
          </div>
        </div>
      </div>
    </SlideOverDrawer>
  );
}

export default FileNotesDrawer;
