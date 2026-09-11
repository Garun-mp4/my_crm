import { sha256Hex } from '../shared/integrations/hash';

export type LocalResearchFailureMode = 'NONE' | 'TRANSIENT' | 'PERMANENT';

export type LocalResearchAdapterInput = {
  sourceUrl: string;
  sourceTitle?: string;
  observation?: string;
  failureMode?: LocalResearchFailureMode;
  attempt: number;
};

export type LocalResearchAdapterResult = {
  name: string;
  kind: 'WEBSITE';
  fact: string;
  sourceUrl: string;
  sourceTitle?: string;
  confidence: 3;
  provenance: 'AI_DRAFT';
  evidenceHash: string;
  payload: {
    provider: 'LOCAL_FIXTURE';
    attempt: number;
  };
};

export class LocalResearchAdapterError extends Error {
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super(code);
    this.name = 'LocalResearchAdapterError';
    this.retryable = retryable;
  }
}

export const runLocalResearchAdapter = (
  input: LocalResearchAdapterInput,
): LocalResearchAdapterResult => {
  const failureMode = input.failureMode ?? 'NONE';

  if (failureMode === 'TRANSIENT') {
    throw new LocalResearchAdapterError(
      'LOCAL_ADAPTER_TRANSIENT_FAILURE',
      true,
    );
  }
  if (failureMode === 'PERMANENT') {
    throw new LocalResearchAdapterError(
      'LOCAL_ADAPTER_PERMANENT_FAILURE',
      false,
    );
  }
  if (!input.observation?.trim()) {
    throw new LocalResearchAdapterError('LOCAL_ADAPTER_NO_OBSERVATION', false);
  }

  const normalizedObservation = input.observation.trim();
  const evidenceHash = sha256Hex(
    JSON.stringify({
      sourceUrl: input.sourceUrl,
      sourceTitle: input.sourceTitle ?? null,
      observation: normalizedObservation,
    }),
  );

  return {
    name: input.sourceTitle?.trim() || 'Local website research',
    kind: 'WEBSITE',
    fact: normalizedObservation,
    sourceUrl: input.sourceUrl,
    sourceTitle: input.sourceTitle?.trim(),
    confidence: 3,
    provenance: 'AI_DRAFT',
    evidenceHash,
    payload: { provider: 'LOCAL_FIXTURE', attempt: input.attempt },
  };
};
