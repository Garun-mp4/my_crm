import { describe, expect, it } from 'vitest';

import {
  assertIdempotencyPayloadMatches,
  buildIdempotencyPayloadHash,
  IdempotencyConflictError,
} from './idempotency';

describe('idempotency payloads', () => {
  it('hashes object key order deterministically', () => {
    expect(
      buildIdempotencyPayloadHash('crm_create_lead', {
        name: 'Studio',
        city: 'Екатеринбург',
      }),
    ).toBe(
      buildIdempotencyPayloadHash('crm_create_lead', {
        city: 'Екатеринбург',
        name: 'Studio',
      }),
    );
  });

  it('rejects a reused key with a different payload hash', () => {
    expect(() =>
      assertIdempotencyPayloadMatches('old-hash', 'new-hash'),
    ).toThrow(IdempotencyConflictError);
    expect(() =>
      assertIdempotencyPayloadMatches('same-hash', 'same-hash'),
    ).not.toThrow();
  });
});
