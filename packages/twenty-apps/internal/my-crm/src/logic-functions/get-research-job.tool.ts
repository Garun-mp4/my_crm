import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  buildAppClient,
  readFirstEdgeNode,
  readNumber,
  readProperty,
  readString,
} from '../modules/shared/integrations/core-api';
import {
  invalidInput,
  notFound,
  operationFailure,
  type ToolResult,
} from '../modules/shared/logic/tool-result';
import {
  getResearchJobSchema,
  type GetResearchJobPayload,
} from '../modules/shared/logic/tool-schemas';

const inputSchema = {
  type: 'object',
  properties: { jobId: { type: 'string', description: 'Research job id' } },
  required: ['jobId'],
  additionalProperties: false,
} as const;

type GetResearchJobResult = ToolResult<{
  jobId: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  retryable: boolean;
  nextRetryAt: string | null;
  lastError: string | null;
  resultResearchId: string | null;
  correlationId: string;
}>;

const handler = async (
  rawPayload: GetResearchJobPayload,
  _context: LogicFunctionExecutionContext,
): Promise<GetResearchJobResult> => {
  const parsed = getResearchJobSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Research job input is invalid.');

  try {
    const response: unknown = await buildAppClient().query({
      researchJobs: {
        __args: { filter: { id: { eq: parsed.data.jobId } }, first: 1 },
        edges: {
          node: {
            id: true,
            status: true,
            attemptCount: true,
            maxAttempts: true,
            retryable: true,
            nextRetryAt: true,
            lastError: true,
            resultResearchId: true,
            correlationId: true,
          },
        },
      },
    });
    const job = readFirstEdgeNode(readProperty(response, 'researchJobs'));
    const jobId = readString(job, 'id');
    const status = readString(job, 'status');
    const attemptCount = readNumber(job, 'attemptCount');
    const maxAttempts = readNumber(job, 'maxAttempts');
    const retryable = readProperty(job, 'retryable');
    const correlationId = readString(job, 'correlationId');
    if (
      !jobId ||
      !status ||
      attemptCount === null ||
      maxAttempts === null ||
      typeof retryable !== 'boolean' ||
      !correlationId
    )
      return notFound('Research job was not found.');

    return {
      ok: true,
      jobId,
      status,
      attemptCount,
      maxAttempts,
      retryable,
      nextRetryAt: readString(job, 'nextRetryAt'),
      lastError: readString(job, 'lastError'),
      resultResearchId: readString(job, 'resultResearchId'),
      correlationId,
    };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'f0a1b2c3-4d5e-4f89-9012-4455667788bb',
  name: 'crm_get_research_job',
  description:
    'Read the bounded state of one research job, including retryability and safe failure metadata.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
