/**
 * Fastify Request Correlation ID Hook
 * 
 * Generates or propagates x-correlation-id HTTP headers and attaches a child logger
 * containing the correlation ID to the Fastify request context.
 */
import { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";

/**
 * Fastify onRequest hook ensuring distributed request tracing via x-correlation-id headers.
 *
 * @param req - Incoming Fastify request object
 * @param reply - Outgoing Fastify response object
 * @param done - Lifecycle continuation callback
 */
export function correlationIdHook(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const correlationId = (req.headers["x-correlation-id"] as string) || randomUUID();
  req.headers["x-correlation-id"] = correlationId;
  reply.header("x-correlation-id", correlationId);
  
  // Scoped child logger injecting the request correlation ID
  req.log = req.log.child({ correlationId });
  done();
}

