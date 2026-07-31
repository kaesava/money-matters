export declare const fileNotesRouter: {
    listFileNotes: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            entityType: string;
            entityId: string;
            status?: "ACTIVE" | "ARCHIVED" | "ALL" | undefined;
        };
        output: {
            createdAt: Date;
            createdBy: string;
            updatedAt: Date;
            updatedBy: string;
            archivedAt: Date | null;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            id: string;
            entityType: string;
            entityId: string;
            comment: string | null;
            fileKey: string | null;
            fileName: string | null;
            fileMimeType: string | null;
            fileSize: string | null;
        }[];
        meta: object;
    }>;
    getFileNoteDownloadUrl: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            downloadUrl: string;
        };
        meta: object;
    }>;
    createPreSignedUploadUrl: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            entityType: string;
            entityId: string;
            fileName: string;
            fileMimeType: string;
            fileSize: number;
        };
        output: {
            fileKey: string;
            uploadUrl: string;
        };
        meta: object;
    }>;
    createFileNote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            entityType: string;
            entityId: string;
            comment?: string | undefined;
            attachment?: {
                fileKey: string;
                fileName: string;
                fileMimeType: string;
                fileSize: number;
            } | undefined;
        };
        output: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            archivedAt: Date | null;
            createdBy: string;
            updatedBy: string;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            entityType: string;
            entityId: string;
            comment: string | null;
            fileKey: string | null;
            fileName: string | null;
            fileMimeType: string | null;
            fileSize: string | null;
        };
        meta: object;
    }>;
    updateFileNoteComment: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            comment: string;
        };
        output: {
            createdAt: Date;
            createdBy: string;
            updatedAt: Date;
            updatedBy: string;
            archivedAt: Date | null;
            archivedBy: string | null;
            tenantId: string;
            appId: string;
            id: string;
            entityType: string;
            entityId: string;
            comment: string | null;
            fileKey: string | null;
            fileName: string | null;
            fileMimeType: string | null;
            fileSize: string | null;
        };
        meta: object;
    }>;
    archiveFileNote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            success: boolean;
            archived: {
                createdAt: Date;
                createdBy: string;
                updatedAt: Date;
                updatedBy: string;
                archivedAt: Date | null;
                archivedBy: string | null;
                tenantId: string;
                appId: string;
                id: string;
                entityType: string;
                entityId: string;
                comment: string | null;
                fileKey: string | null;
                fileName: string | null;
                fileMimeType: string | null;
                fileSize: string | null;
            };
        };
        meta: object;
    }>;
    restoreFileNote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            success: boolean;
            restored: {
                createdAt: Date;
                createdBy: string;
                updatedAt: Date;
                updatedBy: string;
                archivedAt: Date | null;
                archivedBy: string | null;
                tenantId: string;
                appId: string;
                id: string;
                entityType: string;
                entityId: string;
                comment: string | null;
                fileKey: string | null;
                fileName: string | null;
                fileMimeType: string | null;
                fileSize: string | null;
            };
        };
        meta: object;
    }>;
    purgeFileNote: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            success: boolean;
            purgedId: string;
        };
        meta: object;
    }>;
};
//# sourceMappingURL=file-notes.router.d.ts.map