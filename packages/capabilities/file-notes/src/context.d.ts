import React from 'react';
export interface FileNotesService {
    useListQuery: (input: {
        entityType: string;
        entityId: string;
    }) => {
        data: any[] | undefined;
        isFetching: boolean;
        refetch: () => void;
    };
    getDownloadUrl: (id: string) => Promise<{
        downloadUrl: string;
    }>;
    useCreatePreSignedUrlMutation: () => {
        mutateAsync: (input: {
            entityType: string;
            entityId: string;
            fileName: string;
            fileMimeType: string;
            fileSize: number;
        }) => Promise<{
            fileKey: string;
            uploadUrl: string;
        }>;
        isLoading: boolean;
    };
    useCreateMutation: () => {
        mutateAsync: (input: {
            entityType: string;
            entityId: string;
            comment?: string;
            attachment?: {
                fileKey: string;
                fileName: string;
                fileMimeType: string;
                fileSize: number;
            };
        }) => Promise<any>;
        isLoading: boolean;
    };
    useUpdateCommentMutation: () => {
        mutateAsync: (input: {
            id: string;
            comment: string;
        }) => Promise<any>;
        isLoading: boolean;
    };
    useArchiveMutation: () => {
        mutateAsync: (input: {
            id: string;
        }) => Promise<any>;
        isLoading: boolean;
    };
    usePurgeMutation: () => {
        mutateAsync: (input: {
            id: string;
        }) => Promise<any>;
        isLoading: boolean;
    };
}
export declare const FileNotesServiceProvider: ({ children, service, }: {
    children: React.ReactNode;
    service: FileNotesService;
}) => import("react/jsx-runtime").JSX.Element;
export declare function useFileNotesService(): FileNotesService;
//# sourceMappingURL=context.d.ts.map