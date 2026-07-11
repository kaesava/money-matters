import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { verifyJwt } from '@money-matters/core';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const token = req.headers.authorization?.split(" ")[1] || "";
  const session = await verifyJwt(token);

  return {
    req,
    res,
    session, // Full verified session payload
    tenantId: session?.tenantId || null,
    appId: session?.appId || null,
    userId: session?.userId || null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
