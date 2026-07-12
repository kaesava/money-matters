import React, { useState } from 'react';
import { Paperclip, Download } from 'lucide-react';
import { useFileNotes } from './useFileNotes.js';
import { SlideOverDrawer } from '@money-matters/ui';

interface FileNotesDrawerProps {
  entityType: 'expenses' | 'categories' | string;
  entity: any | null;
  onClose: () => void;
  onBack?: () => void;
}

export function FileNotesDrawer({ entityType, entity, onClose, onBack }: FileNotesDrawerProps) {
  const PaperclipIcon = Paperclip as any;
  const DownloadIcon = Download as any;

  const [noteComment, setNoteComment] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

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

  const renderFileNotesFeed = () => {
    if (!notes || notes.length === 0) {
      return <div className="text-center text-slate-400 text-xs py-12">No notes or attachments yet.</div>;
    }
    return notes.map((note: any) => {
      const isEditing = editingNoteId === note.id;
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
                className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 p-2 outline-none focus:border-slate-950 resize-none min-h-[50px]"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setEditingNoteId(null)}
                  className="px-2.5 py-1 text-[10px] font-bold border rounded bg-white text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleSaveCommentEdit(note.id, editingCommentText);
                    setEditingNoteId(null);
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold rounded bg-slate-900 text-white hover:bg-slate-800"
                >
                  Save
                </button>
              </div>
            </div>
          );
        }
        if (note.comment) {
          return <p className="text-xs text-slate-700 whitespace-pre-wrap">{note.comment}</p>;
        }
        return null;
      };

      return (
        <div key={note.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Author: {note.createdBy}
              </span>
              <span className="block text-[9px] text-slate-400">
                {new Date(note.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {!isEditing && (
                <button
                  onClick={() => {
                    setEditingNoteId(note.id);
                    setEditingCommentText(note.comment || '');
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-900 px-1.5 py-0.5"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleArchiveNote(note.id)}
                className="text-[10px] font-bold text-slate-500 hover:text-rose-600 px-1.5 py-0.5"
              >
                Archive
              </button>
              <button
                onClick={() => handlePurgeNote(note.id)}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 px-1.5 py-0.5"
              >
                Purge
              </button>
            </div>
          </div>

          {renderCommentContent()}

          {note.fileKey ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <PaperclipIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={note.fileName || ''}>
                    {note.fileName}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formattedSize} • {note.fileMimeType}
                  </p>
                </div>
              </div>

              <button
                onClick={() => downloadNote(note.id)}
                className="p-1 rounded bg-white border hover:bg-slate-50 text-slate-600"
                title="Download Attachment"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      );
    });
  };

  return (
    <SlideOverDrawer
      title={`Notes & Receipts: ${entity.name || entity.title || 'Record'}`}
      onClose={onClose}
      onBack={onBack}
      widthClass="max-w-md"
    >
      <div className="p-6 space-y-6 bg-slate-50/50 min-h-full">
        {/* File & Note Creation Form */}
        <form onSubmit={onSubmit} className="space-y-4 ui-card p-4">
          <h3 className="text-sm font-bold text-slate-900">Add Note / Attachment</h3>
          
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Comment</label>
            <textarea
              value={noteComment}
              onChange={(e) => setNoteComment(e.target.value)}
              placeholder="Type note comments here..."
              className="w-full text-sm rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-slate-950 transition-all min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Attachment</label>
            <input
              id="file-upload-input"
              type="file"
              onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              Limit: 10MB (PDF, PNG, JPEG, GIF)
            </p>
          </div>

          <button
            type="submit"
            disabled={isUploadingNote || (!noteComment.trim() && !noteFile)}
            className="ui-btn-primary w-full py-2.5 text-xs"
          >
            {isUploadingNote ? 'Posting Note...' : 'Post Note'}
          </button>
        </form>

        {/* List of Files & Notes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-2 border-slate-100 flex items-center justify-between">
            <span>Notes History</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {notes?.length || 0} notes
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
