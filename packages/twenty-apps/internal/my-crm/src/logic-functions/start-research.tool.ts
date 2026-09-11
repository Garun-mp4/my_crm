import { randomUUID } from 'node:crypto';

import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  buildAppClient,
  readFirstEdgeNode,
  readProperty,
  readString,
} from '../modules/shared/integrations/core-api';
import { validateResearchSource } from '../modules/shared/domain/research-source-policy';
import {
  invalidInput,
  notFound,
  operationFailure,
  type ToolResult,
} from '../modules/shared/logic/tool-result';
import {
  startResearchSchema,
  type StartResearchPayload,
} from '../modules/shared/logic/tool-schemas';
import { createAuditActivity } from '../modules/shared/services/audit-activity.service';

const inputSchema = {
  type: 'object',
  properties: {
    leadId: { type: 'string', description: 'Lead record id' },
    sourceUrl: { type: 'string', description: 'Public source URL' },
    sourceTitle: { type: 'string' },
    observation: {
      type: 'string',
      description:
        'Optional local fixture observation. It is stored as an AI draft and always needs review.',
    },
    provider: { type: 'string', enum: ['LOCAL_FIXTURE'] },
    failureMode: { type: 'string', enum: ['NONE', 'TRANSIENT', 'PERMANENT'] },
    maxAttempts: { type: 'integer', minimum: 1, maximum: 5 },
    idempotencyKey: { type: 'string' },
  },
  required: ['leadId', 'sourceUrl', 'idempotencyKey'],
  additionalProperties: false,
} as const;

type StartResearchResult = ToolResult<{
  jobId: string;
  correlationId: string;
  status: 'QUEUED';
  duplicate: boolean;
}>;

const handler = async (
  rawPayload: StartResearchPayload,
  context: LogicFunctionExecutionContext,
): Promise<StartResearchResult> => {
  const parsed = startResearchSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Research job input is invalid.');

  const input = parsed.data;
  const sourceValidation = validateResearchSource(input.sourceUrl);
  if (!sourceValidation.valid)
    return invalidInput(
      `Research source is invalid: ${sourceValidation.reason}.`,
    );

  const client = buildAppClient();
  const correlationId = randomUUID();

  try {
    const leadResponse: unknown = await client.query({
      leads: {
        __args: { filter: { id: { eq: input.leadId } }, first: 1 },
        edges: { node: { id: true } },
      },
    });
    const leadId = readString(
      readFirstEdgeNode(readProperty(leadResponse, 'leads')),
      'id',
    );
    if (!leadId) return notFound('Lead was not found.');

    const existingResponse: unknown = await client.query({
      researchJobs: {
        __args: {
          filter: { idempotencyKey: { eq: input.idempotencyKey } },
          first: 1,
        },
        edges: { node: { id: true, status: true, correlationId: true } },
      },
    });
    const existing = readFirstEdgeNode(
      readProperty(existingResponse, 'researchJobs'),
    );
    const existingId = readString(existing, 'id');
    if (existingId) {
      return {
        ok: true,
        jobId: existingId,
        correlationId: readString(existing, 'correlationId') ?? correlationId,
        status: 'QUEUED',
        duplicate: true,
      };
    }

    const response: unknown = await client.mutation({
      createResearchJob: {
        __args: {
          data: {
            name: `Research job for ${leadId}`,
            status: 'QUEUED',
            provider: input.provider,
            attemptCount: 0,
            maxAttempts: input.maxAttempts,
            retryable: true,
            sourceUrl: { primaryLinkUrl: sourceValidation.normalizedUrl },
            inputPayload: {
              sourceTitle: input.sourceTitle,
              observation: input.observation,
              failureMode: input.failureMode,
            },
            correlationId,
            idempotencyKey: input.idempotencyKey,
            queuedAt: new Date().toISOString(),
            leadId,
          },
        },
        id: true,
        status: true,
      },
    });
    const job = readProperty(response, 'createResearchJob');
    const jobId = readString(job, 'id');
    if (!jobId) throw new Error('CREATE_RESEARCH_JOB_RETURNED_NO_ID');

    await createAuditActivity(client, {
      leadId,
      name: 'Research job queued',
      type: 'NOTE',
      body: `Research job ${jobId} queued for provider ${input.provider}.`,
      actorRole: context.workspaceMemberId ? 'HUMAN' : 'AGENT',
      actor: context.workspaceMemberId ?? 'application',
      source: 'tool.crm_start_research',
      idempotencyKey: input.idempotencyKey,
    });

    return {
      ok: true,
      jobId,
      correlationId,
      status: 'QUEUED',
      duplicate: false,
    };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'c7d8e9f0-1a2b-4c56-8d70-112233445588',
  name: 'crm_start_research',
  description:
    'Queue a source-backed research job. It never treats generated output as verified and never contacts a lead.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
