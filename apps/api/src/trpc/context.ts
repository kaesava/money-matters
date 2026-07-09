import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export function createContext({ req, res }: CreateFastifyContextOptions) {
  const token = req.headers.authorization?.split(" ")[1] || null;
  // Resolve mock security profile metadata securely for V1 target
  const tenantId = token ? "01908bde-34bb-7b19-a178-574211bc93aa" : null;
  const appId = "01908bde-34bb-7b19-a178-574211bc93aa";

  return { req, res, tenantId, appId };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
