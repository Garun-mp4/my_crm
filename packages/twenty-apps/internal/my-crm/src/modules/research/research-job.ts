export const RESEARCH_JOB_STATUSES = [
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const;

export type ResearchJobStatus = (typeof RESEARCH_JOB_STATUSES)[number];

export class ResearchJobStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResearchJobStateError';
  }
}

export const assertResearchJobCanRun = ({
  status,
  attemptCount,
  maxAttempts,
  retryable,
}: {
  status: ResearchJobStatus;
  attemptCount: number;
  maxAttempts: number;
  retryable: boolean;
}): void => {
  if (status === 'SUCCEEDED')
    throw new ResearchJobStateError('RESEARCH_JOB_ALREADY_SUCCEEDED');
  if (status === 'RUNNING')
    throw new ResearchJobStateError('RESEARCH_JOB_ALREADY_RUNNING');
  if (status === 'CANCELLED')
    throw new ResearchJobStateError('RESEARCH_JOB_CANCELLED');
  if (status !== 'QUEUED' && status !== 'FAILED')
    throw new ResearchJobStateError('RESEARCH_JOB_NOT_RUNNABLE');
  if (status === 'FAILED' && !retryable)
    throw new ResearchJobStateError('RESEARCH_JOB_NOT_RETRYABLE');
  if (attemptCount >= maxAttempts)
    throw new ResearchJobStateError('RESEARCH_JOB_ATTEMPT_LIMIT_REACHED');
};

export const calculateRetryAt = (
  attemptCount: number,
  now = new Date(),
): string => {
  const safeAttempt = Math.max(1, Math.min(attemptCount, 8));
  const delayMs = Math.min(60 * 60 * 1000, 30_000 * 2 ** (safeAttempt - 1));
  return new Date(now.getTime() + delayMs).toISOString();
};

export const isRetryableAttempt = ({
  attemptCount,
  maxAttempts,
  retryable,
}: {
  attemptCount: number;
  maxAttempts: number;
  retryable: boolean;
}): boolean => retryable && attemptCount < maxAttempts;
