import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '@money-matters/db';
import { parsedConfig } from '@money-matters/config';

export function createContext({ req, res }: CreateFastifyContextOptions) {
  // Extract tenant/user information from auth headers.
  // In a real implementation, you would verify a JWT from Neon DB Auth here.
  // For the purpose of this demonstration, we mock a tenant context.

  const authHeader = req.headers.authorization;
  const mockTenantId = '00000000-0000-0000-0000-000000000000';
  const mockUserId = '11111111-1111-1111-1111-111111111111';

  return {
    req,
    res,
    db,
    tenantId: mockTenantId,
    userId: mockUserId,
    config: parsedConfig,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
