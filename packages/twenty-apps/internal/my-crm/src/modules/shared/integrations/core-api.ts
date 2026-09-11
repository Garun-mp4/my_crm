import { CoreApiClient } from 'twenty-client-sdk/core';

export const buildAppClient = (): CoreApiClient => new CoreApiClient();

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const readProperty = (value: unknown, property: string): unknown =>
  isRecord(value) ? value[property] : undefined;

export const readRecord = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null;

export const readString = (value: unknown, property: string): string | null => {
  const candidate = readProperty(value, property);
  return typeof candidate === 'string' && candidate.length > 0
    ? candidate
    : null;
};

export const readNumber = (value: unknown, property: string): number | null => {
  const candidate = readProperty(value, property);
  return typeof candidate === 'number' && Number.isFinite(candidate)
    ? candidate
    : null;
};

export const readBoolean = (
  value: unknown,
  property: string,
): boolean | null => {
  const candidate = readProperty(value, property);
  return typeof candidate === 'boolean' ? candidate : null;
};

export const readFirstEdgeNode = (
  value: unknown,
): Record<string, unknown> | null => {
  const edges = readProperty(value, 'edges');
  if (!Array.isArray(edges)) return null;
  const firstEdge = edges[0];
  return readRecord(readProperty(firstEdge, 'node'));
};

export const readEdges = (value: unknown): Record<string, unknown>[] => {
  const edges = readProperty(value, 'edges');
  if (!Array.isArray(edges)) return [];

  return edges.flatMap((edge) => {
    const node = readRecord(readProperty(edge, 'node'));
    return node ? [node] : [];
  });
};

export const requireWorkspaceMember = (
  workspaceMemberId: string | null,
): string => {
  if (!workspaceMemberId) {
    throw new Error('AUTHENTICATED_MEMBER_REQUIRED');
  }

  return workspaceMemberId;
};

export const safeErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'CRM_OPERATION_FAILED';
