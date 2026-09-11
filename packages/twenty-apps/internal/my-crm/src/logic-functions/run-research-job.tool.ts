import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  runLocalResearchAdapter,
  LocalResearchAdapterError,
} from '../modules/research/local-research-adapter';
import {
  assertResearchJobCanRun,
  calculateRetryAt,
  isRetryableAttempt,
  type ResearchJobStatus,
} from '../modules/research/research-job';
import { validateResearchEvidence } from '../modules/shared/domain/research-evidence';
import { validateResearchSource } from '../modules/shared/domain/research-source-policy';
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
  researchFailed,
  type ToolResult,
} from '../modules/shared/logic/tool-result';
import {
  runResearchJobSchema,
  type RunResearchJobPayload,
} from '../modules/shared/logic/tool-schemas';
import { createAuditActivity } from '../modules/shared/services/audit-activity.service';

const inputSchema = {
  type: 'object',
  properties: { jobId: { type: 'string', description: 'Research job id' } },
  required: ['jobId'],
  additionalProperties: false,
} as const;

type RunResearchJobResult = ToolResult<{
  jobId: string;
  researchId: string;
  status: 'SUCCEEDED';
  correlationId: string;
  attemptCount: number;
}>;

type ResearchJobRecord = {
  id: string;
  status: ResearchJobStatus;
  provider: string;
  attemptCount: number;
  maxAttempts: number;
  retryable: boolean;
  sourceUrl: string;
  correlationId: string;
  leadId: string;
  inputPayload: Record<string, unknown>;
};

const readJob = (value: unknown): ResearchJobRecord | null => {
  const id = readString(value, 'id');
  const status = readString(value, 'status') as ResearchJobStatus | null;
  const sourceUrl = readString(
    readProperty(value, 'sourceUrl'),
    'primaryLinkUrl',
  );
  const relationValue = readProperty(value, 'lead');
  const relationLead =
    readRecord(relationValue) ?? readFirstEdgeNode(relationValue);
  const leadId = readString(value, 'leadId') ?? readString(relationLead, 'id');
  const correlationId = readString(value, 'correlationId');
  const provider = readString(value, 'provider');
  const inputPayload = readRecord(readProperty(value, 'inputPayload'));
  const attemptCount = readNumber(value, 'attemptCount');
  const maxAttempts = readNumber(value, 'maxAttempts');
  const retryable = readProperty(value, 'retryable');

  if (
    !id ||
    !status ||
    !sourceUrl ||
    !leadId ||
    !correlationId ||
    !provider ||
    !inputPayload ||
    attemptCount === null ||
    maxAttempts === null ||
    typeof retryable !== 'boolean'
  )
    return null;

  return {
    id,
    status,
    provider,
    attemptCount,
    maxAttempts,
    retryable,
    sourceUrl,
    correlationId,
    leadId,
    inputPayload,
  };
};

const inputString = (
  payload: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const markJobFailed = async ({
  client,
  job,
  attemptCount,
  message,
  retryable,
}: {
  client: ReturnType<typeof buildAppClient>;
  job: ResearchJobRecord;
  attemptCount: number;
  message: string;
  retryable: boolean;
}): Promise<string | null> => {
  const shouldRetry = isRetryableAttempt({
    attemptCount,
    maxAttempts: job.maxAttempts,
    retryable,
  });
  const nextRetryAt = shouldRetry ? calculateRetryAt(attemptCount) : null;

  await client.mutation({
    updateResearchJob: {
      __args: {
        id: job.id,
        data: {
          status: 'FAILED',
          attemptCount,
          retryable: shouldRetry,
          lastError: message,
          nextRetryAt,
          completedAt: new Date().toISOString(),
        },
      },
      id: true,
      status: true,
    },
  });

  await createAuditActivity(client, {
    leadId: job.leadId,
    name: 'Research job failed',
    type: 'NOTE',
    body: `Research job ${job.id} failed: ${message}. Retryable: ${shouldRetry}.`,
    actorRole: 'AGENT',
    actor: 'application',
    source: 'tool.crm_run_research_job',
    idempotencyKey: `${job.id}:failed:${attemptCount}`,
  });

  return nextRetryAt;
};

const findExistingResearchId = async (
  client: ReturnType<typeof buildAppClient>,
  jobId: string,
): Promise<string | null> => {
  const response: unknown = await client.query({
    researches: {
      __args: {
        filter: { extractionRunId: { eq: jobId } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  });

  return readString(
    readFirstEdgeNode(readProperty(response, 'researches')),
    'id',
  );
};

const handler = async (
  rawPayload: RunResearchJobPayload,
  context: LogicFunctionExecutionContext,
): Promise<RunResearchJobResult> => {
  const parsed = runResearchJobSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Research job input is invalid.');

  const client = buildAppClient();
  let runningJob: ResearchJobRecord | null = null;
  let runningAttemptCount: number | null = null;

  try {
    const response: unknown = await client.query({
      researchJobs: {
        __args: { filter: { id: { eq: parsed.data.jobId } }, first: 1 },
        edges: {
          node: {
            id: true,
            status: true,
            provider: true,
            attemptCount: true,
            maxAttempts: true,
            retryable: true,
            sourceUrl: { primaryLinkUrl: true },
            inputPayload: true,
            correlationId: true,
            leadId: true,
            lead: { id: true },
          },
        },
      },
    });
    const job = readJob(
      readFirstEdgeNode(readProperty(response, 'researchJobs')),
    );
    if (!job) return notFound('Research job was not found.');
    if (job.provider !== 'LOCAL_FIXTURE')
      return invalidInput(
        'This local worker cannot run the requested provider.',
      );

    try {
      assertResearchJobCanRun(job);
    } catch (error) {
      return invalidState(
        error instanceof Error
          ? error.message
          : 'Research job is not runnable.',
      );
    }

    const sourceValidation = validateResearchSource(job.sourceUrl);
    if (!sourceValidation.valid)
      return invalidInput(
        `Research source is invalid: ${sourceValidation.reason}.`,
      );

    const attemptCount = job.attemptCount + 1;
    runningJob = job;
    runningAttemptCount = attemptCount;
    await client.mutation({
      updateResearchJob: {
        __args: {
          id: job.id,
          data: {
            status: 'RUNNING',
            attemptCount,
            startedAt: new Date().toISOString(),
            nextRetryAt: null,
            lastError: null,
          },
        },
        id: true,
        status: true,
      },
    });

    const adapterResult = runLocalResearchAdapter({
      sourceUrl: sourceValidation.normalizedUrl ?? job.sourceUrl,
      sourceTitle: inputString(job.inputPayload, 'sourceTitle'),
      observation: inputString(job.inputPayload, 'observation'),
      failureMode: inputString(job.inputPayload, 'failureMode') as
        | 'NONE'
        | 'TRANSIENT'
        | 'PERMANENT'
        | undefined,
      attempt: attemptCount,
    });
    const evidenceValidation = validateResearchEvidence(adapterResult);
    if (!evidenceValidation.valid)
      throw new LocalResearchAdapterError(
        `LOCAL_ADAPTER_INVALID_EVIDENCE:${evidenceValidation.reason}`,
        false,
      );

    const existingResearchId = await findExistingResearchId(client, job.id);
    const researchId =
      existingResearchId ??
      (await (async () => {
        const researchResponse: unknown = await client.mutation({
          createResearch: {
            __args: {
              data: {
                name: adapterResult.name,
                kind: adapterResult.kind,
                fact: evidenceValidation.normalizedFact,
                sourceUrl: { primaryLinkUrl: adapterResult.sourceUrl },
                sourceTitle: adapterResult.sourceTitle,
                observedAt: new Date().toISOString(),
                confidence: adapterResult.confidence,
                provenance: adapterResult.provenance,
                evidenceHash: adapterResult.evidenceHash,
                payload: adapterResult.payload,
                status: 'REVIEW_REQUIRED',
                extractionRunId: job.id,
                leadId: job.leadId,
              },
            },
            id: true,
            name: true,
          },
        });
        const createdResearchId = readString(
          readProperty(researchResponse, 'createResearch'),
          'id',
        );
        if (!createdResearchId)
          throw new Error('CREATE_RESEARCH_RETURNED_NO_ID');

        return createdResearchId;
      })());

    await client.mutation({
      updateResearchJob: {
        __args: {
          id: job.id,
          data: {
            status: 'SUCCEEDED',
            retryable: false,
            resultResearchId: researchId,
            completedAt: new Date().toISOString(),
            nextRetryAt: null,
            lastError: null,
          },
        },
        id: true,
        status: true,
      },
    });
    await client.mutation({
      updateLead: {
        __args: {
          id: job.leadId,
          data: { researchStatus: 'REVIEW_REQUIRED' },
        },
        id: true,
        researchStatus: true,
      },
    });
    await createAuditActivity(client, {
      leadId: job.leadId,
      name: 'Research job succeeded',
      type: 'RESEARCH_CAPTURED',
      body: `Research evidence ${researchId} captured from job ${job.id} and awaits review.`,
      actorRole: context.workspaceMemberId ? 'HUMAN' : 'AGENT',
      actor: context.workspaceMemberId ?? 'application',
      source: 'tool.crm_run_research_job',
      idempotencyKey: `${job.id}:succeeded:${attemptCount}`,
    });

    return {
      ok: true,
      jobId: job.id,
      researchId,
      status: 'SUCCEEDED',
      correlationId: job.correlationId,
      attemptCount,
    };
  } catch (error) {
    if (!runningJob || runningAttemptCount === null)
      return operationFailure(error);

    try {
      const isAdapterFailure = error instanceof LocalResearchAdapterError;
      const nextRetryAt = await markJobFailed({
        client,
        job: runningJob,
        attemptCount: runningAttemptCount,
        message: isAdapterFailure ? error.message : 'CRM_OPERATION_FAILED',
        retryable: isAdapterFailure ? error.retryable : true,
      });

      return researchFailed({
        message: nextRetryAt
          ? 'Research job failed and can be retried.'
          : 'Research job failed and cannot be retried.',
        retryable: Boolean(nextRetryAt),
        correlationId: runningJob.correlationId,
        details: {
          jobId: runningJob.id,
          attemptCount: runningAttemptCount,
          nextRetryAt,
        },
      });
    } catch {
      return operationFailure(error);
    }
  }
};

export default defineLogicFunction({
  universalIdentifier: 'd8e9f0a1-2b3c-4d67-9e81-223344556699',
  name: 'crm_run_research_job',
  description:
    'Run one local research job, persist review-required evidence, and expose retryable failures without sending messages.',
  timeoutSeconds: 30,
  handler,
  toolTriggerSettings: { inputSchema },
});
