import { PgDatabase } from "drizzle-orm/pg-core";
export declare function listFileNotesHandler(db: PgDatabase<any, any, any>): (input: {
    entityType: string;
    entityId: string;
    status: "ACTIVE" | "ARCHIVED" | "ALL";
}, tenantId: string) => Promise<{
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
}[]>;
export declare function getFileNoteDownloadUrlHandler(): (id: string, tenantId: string, db: PgDatabase<any, any, any>) => Promise<{
    downloadUrl: string;
}>;
export declare function createPreSignedUploadUrlHandler(): (input: {
    entityType: string;
    entityId: string;
    fileName: string;
    fileMimeType: string;
    fileSize: number;
}, tenantId: string) => Promise<{
    fileKey: string;
    uploadUrl: string;
}>;
export declare function createFileNoteHandler(db: PgDatabase<any, any, any>): (input: {
    entityType: string;
    entityId: string;
    comment?: string;
    attachment?: {
        fileKey: string;
        fileName: string;
        fileMimeType: string;
        fileSize: number;
    };
}, tenantId: string, appId: string, userId: string) => Promise<{
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
}>;
export declare function updateFileNoteCommentHandler(db: PgDatabase<any, any, any>): (input: {
    id: string;
    comment: string;
}, tenantId: string, userId: string) => Promise<{
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
}>;
export declare function archiveFileNoteHandler(db: PgDatabase<any, any, any>): (id: string, tenantId: string, userId: string) => Promise<{
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
}>;
export declare function restoreFileNoteHandler(db: PgDatabase<any, any, any>): (id: string, tenantId: string, userId: string) => Promise<{
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
}>;
export declare function purgeFileNoteHandler(db: PgDatabase<any, any, any>): (id: string, tenantId: string) => Promise<{
    success: boolean;
    purgedId: string;
}>;
//# sourceMappingURL=index.d.ts.map