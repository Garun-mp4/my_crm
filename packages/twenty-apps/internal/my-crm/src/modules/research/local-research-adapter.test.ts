import { describe, expect, it } from 'vitest';

import {
  LocalResearchAdapterError,
  runLocalResearchAdapter,
} from './local-research-adapter';

describe('local research adapter', () => {
  it('returns a deterministic, review-required fixture result', () => {
    const result = runLocalResearchAdapter({
      sourceUrl: 'https://example.com/',
      sourceTitle: 'Example site',
      observation: 'The public site has a clear contact page.',
      attempt: 1,
    });

    expect(result.provenance).toBe('AI_DRAFT');
    expect(result.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.payload.provider).toBe('LOCAL_FIXTURE');
  });

  it('exposes retryability without leaking an implementation stack', () => {
    expect(() =>
      runLocalResearchAdapter({
        sourceUrl: 'https://example.com/',
        failureMode: 'TRANSIENT',
        attempt: 1,
      }),
    ).toThrow(LocalResearchAdapterError);

    try {
      runLocalResearchAdapter({
        sourceUrl: 'https://example.com/',
        failureMode: 'TRANSIENT',
        attempt: 1,
      });
    } catch (error) {
      expect(error).toMatchObject({
        message: 'LOCAL_ADAPTER_TRANSIENT_FAILURE',
        retryable: true,
      });
    }
  });
});
