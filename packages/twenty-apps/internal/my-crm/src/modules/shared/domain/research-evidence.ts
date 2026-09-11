export const RESEARCH_PROVENANCE = [
  'HUMAN',
  'AI_DRAFT',
  'IMPORTED',
  'SYSTEM',
] as const;

export type ResearchProvenance = (typeof RESEARCH_PROVENANCE)[number];

export type ResearchEvidenceInput = {
  fact: string;
  sourceUrl?: string | null;
  observedAt?: string | null;
  provenance: ResearchProvenance;
  evidenceHash?: string | null;
};

export type ResearchEvidenceValidation =
  | { valid: true; normalizedFact: string }
  | {
      valid: false;
      reason:
        | 'EMPTY_FACT'
        | 'MISSING_SOURCE'
        | 'MISSING_TIMESTAMP'
        | 'INVALID_HASH';
    };

export const validateResearchEvidence = (
  evidence: ResearchEvidenceInput,
): ResearchEvidenceValidation => {
  const normalizedFact = evidence.fact.trim();
  if (normalizedFact.length === 0)
    return { valid: false, reason: 'EMPTY_FACT' };

  if (evidence.provenance !== 'HUMAN' && !evidence.sourceUrl?.trim()) {
    return { valid: false, reason: 'MISSING_SOURCE' };
  }

  if (evidence.provenance === 'HUMAN' && !evidence.observedAt?.trim()) {
    return { valid: false, reason: 'MISSING_TIMESTAMP' };
  }

  if (!isEvidenceHashStable(evidence.evidenceHash)) {
    return { valid: false, reason: 'INVALID_HASH' };
  }

  return { valid: true, normalizedFact };
};

export const isEvidenceHashStable = (
  value: string | null | undefined,
): boolean =>
  value === undefined || value === null || /^[a-f0-9]{64}$/i.test(value);
