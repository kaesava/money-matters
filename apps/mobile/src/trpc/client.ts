import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@money-matters/api/src/routers/_app';

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();
