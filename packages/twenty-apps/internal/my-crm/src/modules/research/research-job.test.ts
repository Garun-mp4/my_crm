import { describe, expect, it } from 'vitest';

import {
  assertResearchJobCanRun,
  calculateRetryAt,
  isRetryableAttempt,
  ResearchJobStateError,
} from './research-job';

describe('research job state', () => {
  it('allows queued jobs and exponential retry windows', () => {
    expect(() =>
      assertResearchJobCanRun({
        status: 'QUEUED',
        attemptCount: 0,
        maxAttempts: 3,
        retryable: true,
      }),
    ).not.toThrow();

    expect(calculateRetryAt(2, new Date('2026-09-11T10:00:00.000Z'))).toBe(
      '2026-09-11T10:01:00.000Z',
    );
  });

  it('fails closed for non-retryable and exhausted jobs', () => {
    expect(() =>
      assertResearchJobCanRun({
        status: 'FAILED',
        attemptCount: 1,
        maxAttempts: 3,
        retryable: false,
      }),
    ).toThrow(ResearchJobStateError);
    expect(
      isRetryableAttempt({ attemptCount: 3, maxAttempts: 3, retryable: true }),
    ).toBe(false);
  });
});
