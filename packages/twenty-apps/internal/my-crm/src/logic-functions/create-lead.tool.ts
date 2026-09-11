import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import { buildLeadDedupeKey } from '../modules/shared/domain/lead-dedupe';
import {
  buildAppClient,
  readFirstEdgeNode,
  readProperty,
  readString,
} from '../modules/shared/integrations/core-api';
import {
  assertIdempotencyPayloadMatches,
  buildIdempotencyPayloadHash,
} from '../modules/shared/integrations/idempotency';
import { createAuditActivity } from '../modules/shared/services/audit-activity.service';
import {
  createLeadSchema,
  type CreateLeadPayload,
} from '../modules/shared/logic/tool-schemas';
import {
  invalidInput,
  operationFailure,
  type ToolResult,
} from '../modules/shared/logic/tool-result';

const inputSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Business name' },
    city: { type: 'string', description: 'City where the business operates' },
    category: { type: 'string', description: 'Business category' },
    websiteUrl: { type: 'string', description: 'Public website URL' },
    directoryUrl: { type: 'string', description: 'Public directory card URL' },
    source: {
      type: 'string',
      enum: ['YANDEX_MAPS', 'IMPORT', 'REFERRAL', 'MANUAL', 'OTHER'],
    },
    rating: { type: 'number', minimum: 0, maximum: 5 },
    reviewCount: { type: 'integer', minimum: 0 },
    idempotencyKey: {
      type: 'string',
      description: 'Stable key for retry-safe creation',
    },
  },
  required: ['name'],
  additionalProperties: false,
} as const;

type CreateLeadResult = ToolResult<{
  leadId: string;
  dedupeKey: string;
  duplicate: boolean;
}>;

const handler = async (
  rawPayload: CreateLeadPayload,
  context: LogicFunctionExecutionContext,
): Promise<CreateLeadResult> => {
  const parsed = createLeadSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Lead input is invalid.');

  const input = parsed.data;
  const dedupeKey = buildLeadDedupeKey(input);
  const idempotencyPayloadHash = input.idempotencyKey
    ? buildIdempotencyPayloadHash('crm_create_lead', {
        ...input,
        idempotencyKey: undefined,
      })
    : undefined;
  const client = buildAppClient();

  try {
    if (input.idempotencyKey && idempotencyPayloadHash) {
      const idempotencyResponse: unknown = await client.query({
        leads: {
          __args: {
            filter: { idempotencyKey: { eq: input.idempotencyKey } },
            first: 1,
          },
          edges: {
            node: { id: true, idempotencyPayloadHash: true },
          },
        },
      });
      const existingByKey = readFirstEdgeNode(
        readProperty(idempotencyResponse, 'leads'),
      );
      const existingByKeyId = readString(existingByKey, 'id');
      if (existingByKeyId) {
        assertIdempotencyPayloadMatches(
          readString(existingByKey, 'idempotencyPayloadHash'),
          idempotencyPayloadHash,
        );
        return {
          ok: true,
          leadId: existingByKeyId,
          dedupeKey,
          duplicate: true,
        };
      }
    }

    const existingResponse: unknown = await client.query({
      leads: {
        __args: { filter: { dedupeKey: { eq: dedupeKey } }, first: 1 },
        edges: { node: { id: true } },
      },
    });
    const existing = readFirstEdgeNode(readProperty(existingResponse, 'leads'));
    const existingId = readString(existing, 'id');
    if (existingId)
      return { ok: true, leadId: existingId, dedupeKey, duplicate: true };

    const data: Record<string, unknown> = {
      name: input.name,
      city: input.city,
      category: input.category,
      source: input.source,
      rating: input.rating,
      reviewCount: input.reviewCount,
      dedupeKey,
      idempotencyKey: input.idempotencyKey,
      idempotencyPayloadHash,
      websiteUrl: input.websiteUrl
        ? { primaryLinkUrl: input.websiteUrl }
        : undefined,
      directoryUrl: input.directoryUrl
        ? { primaryLinkUrl: input.directoryUrl }
        : undefined,
    };

    const response: unknown = await client.mutation({
      createLead: {
        __args: { data },
        id: true,
        name: true,
      },
    });
    const created = readProperty(response, 'createLead');
    const leadId = readString(created, 'id');
    if (!leadId) throw new Error('CREATE_LEAD_RETURNED_NO_ID');

    await createAuditActivity(client, {
      leadId,
      name: `Lead created: ${input.name}`,
      type: 'STATUS_CHANGED',
      body: 'Lead entered the CRM through an allowlisted create-lead tool.',
      actorRole: context.workspaceMemberId ? 'HUMAN' : 'AGENT',
      actor: context.workspaceMemberId ?? 'application',
      source: 'tool.crm_create_lead',
      idempotencyKey: input.idempotencyKey ?? dedupeKey,
    });

    return { ok: true, leadId, dedupeKey, duplicate: false };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'f6170a82-b293-4401-8678-889900112233',
  name: 'crm_create_lead',
  description:
    'Create or resolve a deduplicated CRM lead. This never contacts the lead.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
