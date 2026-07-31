export declare function useFileNotes(entityType: string, entityId?: string): {
    notes: any[] | undefined;
    isUploadingNote: boolean;
    toastMessage: {
        type: "success" | "error";
        text: string;
    } | null;
    handleCreateNote: (noteComment: string, noteFile: File | null, onSuccess?: () => void) => Promise<void>;
    handleSaveCommentEdit: (noteId: string, comment: string) => Promise<void>;
    handleArchiveNote: (noteId: string) => Promise<void>;
    handlePurgeNote: (noteId: string) => Promise<void>;
    downloadNote: (noteId: string) => Promise<void>;
};
//# sourceMappingURL=useFileNotes.d.ts.map