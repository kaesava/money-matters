"use client";
import React, { useState } from "react";
import { Paperclip, Download } from "lucide-react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { Spinner } from "@money-matters/ui/web";

interface FileNotesSectionProps {
  entityType: "TRANSACTION" | "EXPENSE" | "CATEGORY" | "BANK_ACCOUNT" | "INCOME";
  entityId: string;
}

export function FileNotesSection({ entityType, entityId }: FileNotesSectionProps) {
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const notesQuery = trpc.listFileNotes.useQuery(
    {
      entityType,
      entityId,
      status: "ACTIVE",
    },
    { enabled: Boolean(entityId) }
  );

  const createPresignedUrlMutation = trpc.createPreSignedUploadUrl.useMutation();
  const createFileNoteMutation = trpc.createFileNote.useMutation({
    onSuccess: () => {
      setComment("");
      setFile(null);
      notesQuery.refetch();
    },
  });

  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && !file) return;

    setIsUploading(true);
    try {
      let attachment = undefined;

      if (file) {
        const presigned = await createPresignedUrlMutation.mutateAsync({
          entityType,
          entityId,
          fileName: file.name,
          fileMimeType: file.type,
          fileSize: file.size,
        });

        const uploadRes = await fetch(presigned.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) {
          throw new Error("File upload failed");
        }

        attachment = {
          fileKey: presigned.fileKey,
          fileName: file.name,
          fileMimeType: file.type,
          fileSize: file.size,
        };
      }

      await createFileNoteMutation.mutateAsync({
        entityType,
        entityId,
        comment: comment.trim() || undefined,
        attachment,
      });
    } catch (err) {
      console.error("Failed to save file note", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (noteId: string) => {
    try {
      const { downloadUrl } = await utils.getFileNoteDownloadUrl.fetch({ id: noteId });
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Failed to download attachment", err);
    }
  };

  const notes = notesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-zinc-100">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        {t("fileNotes.title")}
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("fileNotes.placeholder")}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
          <label className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer flex items-center justify-center text-zinc-500">
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
          <button
            type="submit"
            disabled={isUploading || createFileNoteMutation.isPending || (!comment.trim() && !file)}
            className="px-3 py-2 text-xs font-bold text-white rounded-xl transition-opacity bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {(isUploading || createFileNoteMutation.isPending) && <Spinner size="sm" />}
            {t("fileNotes.post")}
          </button>
        </div>
        {file && (
          <p className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Paperclip className="w-3 h-3 text-[#2563eb]" />
            <span className="truncate max-w-[200px]">{file.name}</span> ({Math.round(file.size / 1024)} KB)
          </p>
        )}
      </form>

      {/* Notes List */}
      {notesQuery.isLoading ? (
        <p className="text-xs text-zinc-400">{t("fileNotes.loading")}</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">{t("fileNotes.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div key={note.id} className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex flex-col gap-1.5">
              {note.comment && <p className="text-xs text-zinc-800 font-medium">{note.comment}</p>}
              {note.fileName && (
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-zinc-200 text-xs">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Paperclip className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate font-medium text-[#1B2B4B]">{note.fileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(note.id)}
                    className="p-1 text-zinc-600 hover:text-[#2563eb]"
                    title={t("fileNotes.downloadAttachment")}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
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
