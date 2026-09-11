import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  buildAppClient,
  readFirstEdgeNode,
  readProperty,
  readString,
} from '../modules/shared/integrations/core-api';
import {
  createOutreachDraftSchema,
  type CreateOutreachDraftPayload,
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
    channel: {
      type: 'string',
      enum: ['EMAIL', 'TELEGRAM', 'WHATSAPP', 'VK', 'OTHER'],
    },
    subject: { type: 'string' },
    body: {
      type: 'string',
      description: 'Draft message. It must not be sent by this tool.',
    },
    sourceFacts: {
      type: 'string',
      description: 'Facts that justify the draft',
    },
    idempotencyKey: { type: 'string', description: 'Stable retry key' },
  },
  required: ['leadId', 'channel', 'body', 'sourceFacts', 'idempotencyKey'],
  additionalProperties: false,
} as const;

type CreateOutreachDraftResult = ToolResult<{
  draftId: string;
  requiresHumanApproval: true;
  duplicate: boolean;
}>;

const handler = async (
  rawPayload: CreateOutreachDraftPayload,
  context: LogicFunctionExecutionContext,
): Promise<CreateOutreachDraftResult> => {
  const parsed = createOutreachDraftSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Outreach draft input is invalid.');

  const input = parsed.data;
  const client = buildAppClient();

  try {
    const existingResponse: unknown = await client.query({
      outreachDrafts: {
        __args: {
          filter: { idempotencyKey: { eq: input.idempotencyKey } },
          first: 1,
        },
        edges: { node: { id: true } },
      },
    });
    const existing = readFirstEdgeNode(
      readProperty(existingResponse, 'outreachDrafts'),
    );
    const existingId = readString(existing, 'id');
    if (existingId) {
      return {
        ok: true,
        draftId: existingId,
        requiresHumanApproval: true,
        duplicate: true,
      };
    }

    const response: unknown = await client.mutation({
      createOutreachDraft: {
        __args: {
          data: {
            name: `${input.channel} draft for ${input.leadId}`,
            channel: input.channel,
            subject: input.subject,
            body: input.body,
            sourceFacts: input.sourceFacts,
            idempotencyKey: input.idempotencyKey,
            generatedAt: new Date().toISOString(),
            status: 'NEEDS_REVIEW',
            leadId: input.leadId,
          },
        },
        id: true,
      },
    });
    const draftId = readString(
      readProperty(response, 'createOutreachDraft'),
      'id',
    );
    if (!draftId) throw new Error('CREATE_DRAFT_RETURNED_NO_ID');

    await createAuditActivity(client, {
      leadId: input.leadId,
      name: `Outreach draft created: ${input.channel}`,
      type: 'DRAFT_CREATED',
      body: 'Draft is waiting for explicit human approval. No external message was sent.',
      actorRole: context.workspaceMemberId ? 'HUMAN' : 'AGENT',
      actor: context.workspaceMemberId ?? 'application',
      source: 'tool.crm_create_outreach_draft',
      idempotencyKey: `draft:${input.idempotencyKey}`,
    });

    return { ok: true, draftId, requiresHumanApproval: true, duplicate: false };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: '1782bc93-d304-4512-8789-990011223345',
  name: 'crm_create_outreach_draft',
  description:
    'Create an outreach draft that can only be sent after human approval.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
