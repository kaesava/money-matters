import React, { useMemo } from 'react';
import { trpc } from '../lib/trpc';
import {
  FileNotesServiceProvider,
  type FileNotesService,
} from '@money-matters/capability-file-notes';

export function MobileFileNotesProvider({ children }: { children: React.ReactNode }) {
  const trpcUtils = trpc.useUtils();

  const service: FileNotesService = useMemo(
    () => ({
      useListQuery: (input) => {
        const query = trpc.fileNotes.list.useQuery(input, {
          enabled: Boolean(input.entityId),
        });
        return {
          data: query.data,
          isFetching: query.isFetching,
          refetch: query.refetch,
        };
      },
      getDownloadUrl: async (id: string) => {
        return trpcUtils.fileNotes.getDownloadUrl.fetch({ id });
      },
      useCreatePreSignedUrlMutation: () => {
        const mut = trpc.fileNotes.createPreSignedUrl.useMutation();
        return {
          mutateAsync: mut.mutateAsync,
          isPending: mut.isPending,
        };
      },
      useCreateMutation: () => {
        const mut = trpc.fileNotes.create.useMutation({
          onSuccess: () => {
            trpcUtils.fileNotes.list.invalidate();
            trpcUtils.fileNotes.getStorageQuota.invalidate();
          },
        });
        return {
          mutateAsync: mut.mutateAsync,
          isPending: mut.isPending,
        };
      },
      useUpdateCommentMutation: () => {
        const mut = trpc.fileNotes.updateComment.useMutation({
          onSuccess: () => {
            trpcUtils.fileNotes.list.invalidate();
          },
        });
        return {
          mutateAsync: mut.mutateAsync,
          isPending: mut.isPending,
        };
      },
      useArchiveMutation: () => {
        const mut = trpc.fileNotes.archive.useMutation({
          onSuccess: () => {
            trpcUtils.fileNotes.list.invalidate();
          },
        });
        return {
          mutateAsync: mut.mutateAsync,
          isPending: mut.isPending,
        };
      },
      usePurgeMutation: () => {
        const mut = trpc.fileNotes.purge.useMutation({
          onSuccess: () => {
            trpcUtils.fileNotes.list.invalidate();
            trpcUtils.fileNotes.getStorageQuota.invalidate();
          },
        });
        return {
          mutateAsync: mut.mutateAsync,
          isPending: mut.isPending,
        };
      },
    }),
    [trpcUtils]
  );

  return <FileNotesServiceProvider service={service}>{children}</FileNotesServiceProvider>;
}
