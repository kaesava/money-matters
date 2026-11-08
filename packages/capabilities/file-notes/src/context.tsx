import React, { createContext, useContext } from 'react';
import type { FileNoteDto, CreatePreSignedUrlInput, CreateFileNoteInput, UpdateFileNoteCommentInput } from '@money-matters/types';

export type ClientFileNoteDto = Omit<FileNoteDto, 'createdAt' | 'updatedAt' | 'archivedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date;
  archivedAt: string | Date | null;
};

export interface FileNotesService {
  useListQuery: (input: { entityType: 'ENVELOPE' | 'BANK_ACCOUNT'; entityId: string }) => {
    data: ClientFileNoteDto[] | undefined;
    isFetching: boolean;
    refetch: () => void;
  };
  getDownloadUrl: (id: string) => Promise<{ downloadUrl: string }>;
  useCreatePreSignedUrlMutation: () => {
    mutateAsync: (input: CreatePreSignedUrlInput) => Promise<{ fileKey: string; uploadUrl: string }>;
    isPending: boolean;
  };
  useCreateMutation: () => {
    mutateAsync: (input: CreateFileNoteInput) => Promise<ClientFileNoteDto>;
    isPending: boolean;
  };
  useUpdateCommentMutation: () => {
    mutateAsync: (input: UpdateFileNoteCommentInput) => Promise<ClientFileNoteDto>;
    isPending: boolean;
  };
  useArchiveMutation: () => {
    mutateAsync: (input: { id: string }) => Promise<{ success: boolean }>;
    isPending: boolean;
  };
  usePurgeMutation: () => {
    mutateAsync: (input: { id: string }) => Promise<{ success: boolean; purgedId: string }>;
    isPending: boolean;
  };
}

const FileNotesServiceContext = createContext<FileNotesService | null>(null);

export const FileNotesServiceProvider = ({
  children,
  service,
}: {
  children: React.ReactNode;
  service: FileNotesService;
}) => (
  <FileNotesServiceContext.Provider value={service}>{children}</FileNotesServiceContext.Provider>
);

export const useFileNotesService = (): FileNotesService => {
  const context = useContext(FileNotesServiceContext);
  if (!context) {
    throw new Error('useFileNotesService must be used within a FileNotesServiceProvider');
  }
  return context;
};
