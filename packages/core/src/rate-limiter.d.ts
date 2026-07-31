import { FastifyInstance, FastifyPluginOptions } from "fastify";
declare function rateLimiterPlugin(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void): void;
export declare const rateLimiter: typeof rateLimiterPlugin;
export {};
//# sourceMappingURL=rate-limiter.d.ts.map