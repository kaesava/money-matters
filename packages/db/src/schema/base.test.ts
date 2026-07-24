import { describe, it, expect } from 'vitest';
import { timestamps, tenantAndTimestamps } from './base.js';

describe('Database Base Schema Mixins', () => {
  it('defines mandatory audit timestamp columns', () => {
    expect(timestamps).toHaveProperty('createdAt');
    expect(timestamps).toHaveProperty('createdBy');
    expect(timestamps).toHaveProperty('updatedAt');
    expect(timestamps).toHaveProperty('updatedBy');
    expect(timestamps).toHaveProperty('archivedAt');
    expect(timestamps).toHaveProperty('archivedBy');
  });

  it('includes multi-tenant partitioning keys in tenantAndTimestamps', () => {
    expect(tenantAndTimestamps).toHaveProperty('tenantId');
    expect(tenantAndTimestamps).toHaveProperty('appId');
    expect(tenantAndTimestamps).toHaveProperty('createdAt');
    expect(tenantAndTimestamps).toHaveProperty('updatedAt');
  });
});
