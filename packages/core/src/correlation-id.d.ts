/**
 * Fastify Request Correlation ID Hook
 *
 * Generates or propagates x-correlation-id HTTP headers and attaches a child logger
 * containing the correlation ID to the Fastify request context.
 */
import { FastifyRequest, FastifyReply } from "fastify";
/**
 * Fastify onRequest hook ensuring distributed request tracing via x-correlation-id headers.
 *
 * @param req - Incoming Fastify request object
 * @param reply - Outgoing Fastify response object
 * @param done - Lifecycle continuation callback
 */
export declare function correlationIdHook(req: FastifyRequest, reply: FastifyReply, done: () => void): void;
//# sourceMappingURL=correlation-id.d.ts.map