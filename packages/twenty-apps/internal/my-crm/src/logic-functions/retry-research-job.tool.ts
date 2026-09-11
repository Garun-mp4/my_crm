import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  assertResearchJobCanRun,
  type ResearchJobStatus,
} from '../modules/research/research-job';
import {
  buildAppClient,
  readFirstEdgeNode,
  readNumber,
  readProperty,
  readRecord,
  readString,
} from '../modules/shared/integrations/core-api';
import {
  invalidInput,
  invalidState,
  notFound,
  operationFailure,
  type ToolResult,
} from '../modules/shared/logic/tool-result';
import {
  retryResearchJobSchema,
  type RetryResearchJobPayload,
} from '../modules/shared/logic/tool-schemas';
import { createAuditActivity } from '../modules/shared/services/audit-activity.service';

const inputSchema = {
  type: 'object',
  properties: {
    jobId: { type: 'string', description: 'Research job id' },
    idempotencyKey: { type: 'string' },
  },
  required: ['jobId'],
  additionalProperties: false,
} as const;

type RetryResearchJobResult = ToolResult<{
  jobId: string;
  status: 'QUEUED';
  attemptCount: number;
}>;

const handler = async (
  rawPayload: RetryResearchJobPayload,
  context: LogicFunctionExecutionContext,
): Promise<RetryResearchJobResult> => {
  const parsed = retryResearchJobSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Research retry input is invalid.');

  const client = buildAppClient();

  try {
    const response: unknown = await client.query({
      researchJobs: {
        __args: { filter: { id: { eq: parsed.data.jobId } }, first: 1 },
        edges: {
          node: {
            id: true,
            status: true,
            attemptCount: true,
            maxAttempts: true,
            retryable: true,
            leadId: true,
            correlationId: true,
            lead: { id: true },
          },
        },
      },
    });
    const job = readFirstEdgeNode(readProperty(response, 'researchJobs'));
    const jobId = readString(job, 'id');
    const status = readString(job, 'status') as ResearchJobStatus | null;
    const attemptCount = readNumber(job, 'attemptCount');
    const maxAttempts = readNumber(job, 'maxAttempts');
    const retryable = readProperty(job, 'retryable');
    const leadId =
      readString(job, 'leadId') ??
      readString(readRecord(readProperty(job, 'lead')), 'id');
    if (
      !jobId ||
      !status ||
      attemptCount === null ||
      maxAttempts === null ||
      typeof retryable !== 'boolean' ||
      !leadId
    )
      return notFound('Research job was not found.');

    if (status !== 'FAILED')
      return invalidState('Only failed research jobs can be requeued.');

    try {
      assertResearchJobCanRun({
        status,
        attemptCount,
        maxAttempts,
        retryable,
      });
    } catch (error) {
      return invalidState(
        error instanceof Error
          ? error.message
          : 'Research job is not retryable.',
      );
    }

    await client.mutation({
      updateResearchJob: {
        __args: {
          id: jobId,
          data: {
            status: 'QUEUED',
            retryable: true,
            nextRetryAt: null,
            lastError: null,
          },
        },
        id: true,
        status: true,
      },
    });
    await createAuditActivity(client, {
      leadId,
      name: 'Research job requeued',
      type: 'NOTE',
      body: `Research job ${jobId} was explicitly requeued for another attempt.`,
      actorRole: context.workspaceMemberId ? 'HUMAN' : 'AGENT',
      actor: context.workspaceMemberId ?? 'application',
      source: 'tool.crm_retry_research_job',
      idempotencyKey:
        parsed.data.idempotencyKey ?? `${jobId}:retry:${attemptCount}`,
    });

    return { ok: true, jobId, status: 'QUEUED', attemptCount };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'e9f0a1b2-3c4d-4e78-8f92-3344556677aa',
  name: 'crm_retry_research_job',
  description:
    'Explicitly requeue a retryable failed research job. It never contacts a lead.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
