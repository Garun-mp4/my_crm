import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import { validateResearchEvidence } from '../modules/shared/domain/research-evidence';
import { validateResearchSource } from '../modules/shared/domain/research-source-policy';
import {
  buildAppClient,
  readFirstEdgeNode,
  readProperty,
  readString,
  toRichTextValue,
} from '../modules/shared/integrations/core-api';
import {
  assertIdempotencyPayloadMatches,
  buildIdempotencyPayloadHash,
} from '../modules/shared/integrations/idempotency';
import {
  recordResearchSchema,
  type RecordResearchPayload,
} from '../modules/shared/logic/tool-schemas';
import {
  invalidInput,
  operationFailure,
  type ToolResult,
} from '../modules/shared/logic/tool-result';
import { createAuditActivity } from '../modules/shared/services/audit-activity.service';

const inputSchema = {
  type: 'object',
  properties: {
    leadId: { type: 'string', description: 'Lead record id' },
    name: { type: 'string', description: 'Short evidence title' },
    kind: {
      type: 'string',
      enum: [
        'DIRECTORY',
        'REVIEW',
        'WEBSITE',
        'SCREENSHOT',
        'SOURCE_CODE',
        'OTHER',
      ],
    },
    fact: {
      type: 'string',
      description: 'One observable fact, not an unsupported conclusion',
    },
    sourceUrl: { type: 'string', description: 'URL supporting the fact' },
    sourceTitle: { type: 'string' },
    observedAt: { type: 'string', description: 'ISO timestamp' },
    confidence: { type: 'integer', minimum: 1, maximum: 5 },
    provenance: {
      type: 'string',
      enum: ['HUMAN', 'AI_DRAFT', 'IMPORTED', 'SYSTEM'],
    },
    evidenceHash: {
      type: 'string',
      description: 'SHA-256 of the captured evidence',
    },
    payload: { type: 'object' },
    idempotencyKey: { type: 'string' },
  },
  required: ['leadId', 'name', 'fact'],
  additionalProperties: false,
} as const;

type RecordResearchResult = ToolResult<{
  researchId: string;
  reviewRequired: boolean;
}>;

const handler = async (
  rawPayload: RecordResearchPayload,
  context: LogicFunctionExecutionContext,
): Promise<RecordResearchResult> => {
  const parsed = recordResearchSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Research input is invalid.');

  const input = parsed.data;
  const validation = validateResearchEvidence(input);
  if (!validation.valid)
    return invalidInput(`Research evidence is invalid: ${validation.reason}.`);

  const sourceValidation = validateResearchSource(input.sourceUrl);
  if (!sourceValidation.valid)
    return invalidInput(
      `Research source is invalid: ${sourceValidation.reason}.`,
    );

  const client = buildAppClient();
  const reviewRequired = input.provenance === 'AI_DRAFT';
  const idempotencyPayloadHash = input.idempotencyKey
    ? buildIdempotencyPayloadHash('crm_record_research', {
        ...input,
        idempotencyKey: undefined,
      })
    : undefined;

  try {
    if (input.idempotencyKey) {
      const existingResponse: unknown = await client.query({
        researches: {
          __args: {
            filter: { extractionRunId: { eq: input.idempotencyKey } },
            first: 1,
          },
          edges: {
            node: { id: true, idempotencyPayloadHash: true },
          },
        },
      });
      const existing = readFirstEdgeNode(
        readProperty(existingResponse, 'researches'),
      );
      const existingId = readString(existing, 'id');
      if (existingId) {
        assertIdempotencyPayloadMatches(
          readString(existing, 'idempotencyPayloadHash'),
          idempotencyPayloadHash ?? '',
        );
        return { ok: true, researchId: existingId, reviewRequired };
      }
    }

    const data: Record<string, unknown> = {
      name: input.name,
      kind: input.kind,
      fact: toRichTextValue(validation.normalizedFact),
      sourceUrl: input.sourceUrl
        ? { primaryLinkUrl: sourceValidation.normalizedUrl }
        : undefined,
      sourceTitle: input.sourceTitle,
      observedAt: input.observedAt,
      confidence: input.confidence,
      provenance: input.provenance,
      evidenceHash: input.evidenceHash,
      payload: input.payload,
      status: reviewRequired ? 'REVIEW_REQUIRED' : 'CAPTURED',
      extractionRunId: input.idempotencyKey,
      idempotencyPayloadHash,
      leadId: input.leadId,
    };
    const response: unknown = await client.mutation({
      createResearch: {
        __args: { data },
        id: true,
        name: true,
      },
    });
    const researchId = readString(
      readProperty(response, 'createResearch'),
      'id',
    );
    if (!researchId) throw new Error('CREATE_RESEARCH_RETURNED_NO_ID');

    await createAuditActivity(client, {
      leadId: input.leadId,
      name: `Research captured: ${input.name}`,
      type: 'RESEARCH_CAPTURED',
      body: validation.normalizedFact,
      actorRole: context.workspaceMemberId ? 'HUMAN' : 'AGENT',
      actor: context.workspaceMemberId ?? 'application',
      source: 'tool.crm_record_research',
      idempotencyKey: input.idempotencyKey ?? researchId,
    });

    return { ok: true, researchId, reviewRequired };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: '0671ab82-c293-4401-8678-990011223344',
  name: 'crm_record_research',
  description:
    'Store source-backed lead research with provenance and review status.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
