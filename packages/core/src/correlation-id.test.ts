import { describe, it, expect, vi } from 'vitest';
import { correlationIdHook } from './correlation-id.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

describe('Correlation ID Hook', () => {
  it('generates a new correlation ID if header is not present on request', () => {
    const mockChild = vi.fn().mockReturnValue({});
    const req = {
      headers: {},
      log: { child: mockChild },
    } as unknown as FastifyRequest;

    const setHeader = vi.fn();
    const reply = {
      header: setHeader,
    } as unknown as FastifyReply;

    const done = vi.fn();

    correlationIdHook(req, reply, done);

    expect(req.headers['x-correlation-id']).toBeDefined();
    expect(typeof req.headers['x-correlation-id']).toBe('string');
    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', req.headers['x-correlation-id']);
    expect(mockChild).toHaveBeenCalledWith({ correlationId: req.headers['x-correlation-id'] });
    expect(done).toHaveBeenCalled();
  });

  it('reuses existing x-correlation-id header when provided by client', () => {
    const customId = 'custom-correlation-12345';
    const mockChild = vi.fn().mockReturnValue({});
    const req = {
      headers: { 'x-correlation-id': customId },
      log: { child: mockChild },
    } as unknown as FastifyRequest;

    const setHeader = vi.fn();
    const reply = { header: setHeader } as unknown as FastifyReply;
    const done = vi.fn();

    correlationIdHook(req, reply, done);

    expect(req.headers['x-correlation-id']).toBe(customId);
    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', customId);
    expect(mockChild).toHaveBeenCalledWith({ correlationId: customId });
    expect(done).toHaveBeenCalled();
  });
});

