import { describe, it, expect } from 'vitest';
import { buildTrpcClient, trpc } from './trpc.js';

describe('Web tRPC Integration', () => {
  it('instantiates tRPC React hooks', () => {
    expect(trpc).toBeDefined();
    expect(trpc.useContext).toBeDefined();
  });

  it('builds a valid tRPC client instance', () => {
    const client = buildTrpcClient();
    expect(client).toBeDefined();
  });
});
