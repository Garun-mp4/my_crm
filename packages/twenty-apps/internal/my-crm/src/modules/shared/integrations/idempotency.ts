import { sha256Hex } from './hash';

export class IdempotencyConflictError extends Error {
  constructor() {
    super('The idempotency key was already used with a different payload.');
    this.name = 'IdempotencyConflictError';
  }
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== 'object' || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
};

export const buildIdempotencyPayloadHash = (
  operation: string,
  payload: unknown,
): string =>
  sha256Hex(JSON.stringify({ operation, payload: canonicalize(payload) }));

export const assertIdempotencyPayloadMatches = (
  existingPayloadHash: string | null,
  requestedPayloadHash: string,
): void => {
  if (existingPayloadHash && existingPayloadHash !== requestedPayloadHash) {
    throw new IdempotencyConflictError();
  }
};
