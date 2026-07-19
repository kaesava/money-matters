"use client";
import React, { useState } from "react";
import { trpc } from "../../lib/trpc";

interface FileNotesSectionProps {
  entityType: string;
  entityId: string;
}

export function FileNotesSection({ entityType, entityId }: FileNotesSectionProps) {
  const [comment, setComment] = useState("");

  const notesQuery = trpc.listFileNotes.useQuery({
    entityType,
    entityId,
    status: "ACTIVE",
  });

  const createFileNoteMutation = trpc.createFileNote.useMutation({
    onSuccess: () => {
      setComment("");
      notesQuery.refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    createFileNoteMutation.mutate({
      entityType,
      entityId,
      comment: comment.trim(),
    });
  };

  const notes = notesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-3 pt-4 border-t" style={{ borderColor: "var(--dash-border)" }}>
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        Notes & Comments
      </p>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a note or comment..."
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={createFileNoteMutation.isPending || !comment.trim()}
          className="px-3 py-2 text-xs font-bold text-white rounded-xl transition-opacity bg-[#00B4A6] hover:opacity-90 disabled:opacity-50"
        >
          {createFileNoteMutation.isPending ? "Posting..." : "Post"}
        </button>
      </form>

      {/* Notes List */}
      {notesQuery.isLoading ? (
        <p className="text-xs text-zinc-400">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">No notes added yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div key={note.id} className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex flex-col gap-1">
              <p className="text-xs text-zinc-800 font-medium">{note.comment}</p>
              <span className="text-[10px] text-zinc-400">
                {new Date(note.createdAt).toLocaleDateString("en-AU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
