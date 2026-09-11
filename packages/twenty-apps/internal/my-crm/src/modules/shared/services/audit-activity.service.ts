import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  readFirstEdgeNode,
  readProperty,
  readString,
} from '../integrations/core-api';
import {
  assertIdempotencyPayloadMatches,
  buildIdempotencyPayloadHash,
} from '../integrations/idempotency';

export type AuditActivityInput = {
  leadId: string;
  name: string;
  type: string;
  body: string;
  actorRole: 'HUMAN' | 'AGENT' | 'SYSTEM';
  actor: string;
  source: string;
  idempotencyKey: string;
  payloadHash?: string;
};

export const createAuditActivity = async (
  client: CoreApiClient,
  input: AuditActivityInput,
): Promise<string | null> => {
  const idempotencyPayloadHash =
    input.payloadHash ??
    buildIdempotencyPayloadHash(input.source, {
      leadId: input.leadId,
      name: input.name,
      type: input.type,
      body: input.body,
      actorRole: input.actorRole,
      actor: input.actor,
      source: input.source,
    });
  const existingResponse: unknown = await client.query({
    crmActivities: {
      __args: {
        filter: { idempotencyKey: { eq: input.idempotencyKey } },
        first: 1,
      },
      edges: {
        node: { id: true, idempotencyPayloadHash: true },
      },
    },
  });
  const existing = readFirstEdgeNode(
    readProperty(existingResponse, 'crmActivities'),
  );
  const existingId = readString(existing, 'id');
  if (existingId) {
    assertIdempotencyPayloadMatches(
      readString(existing, 'idempotencyPayloadHash'),
      idempotencyPayloadHash,
    );
    return existingId;
  }

  const response: unknown = await client.mutation({
    createCrmActivity: {
      __args: {
        data: {
          name: input.name,
          type: input.type,
          body: input.body,
          actorRole: input.actorRole,
          actor: input.actor,
          source: input.source,
          idempotencyKey: input.idempotencyKey,
          idempotencyPayloadHash,
          occurredAt: new Date().toISOString(),
          leadId: input.leadId,
        },
      },
      id: true,
    },
  });

  const created =
    response && typeof response === 'object'
      ? (response as Record<string, unknown>).createCrmActivity
      : undefined;

  return created && typeof created === 'object'
    ? typeof (created as Record<string, unknown>).id === 'string'
      ? ((created as Record<string, unknown>).id as string)
      : null
    : null;
};
