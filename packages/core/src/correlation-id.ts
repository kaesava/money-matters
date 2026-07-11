import { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";

export function correlationIdHook(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const correlationId = (req.headers["x-correlation-id"] as string) || randomUUID();
  req.headers["x-correlation-id"] = correlationId;
  reply.header("x-correlation-id", correlationId);
  
  // Scoped child logger injecting the request correlation ID
  req.log = req.log.child({ correlationId });
  done();
}
