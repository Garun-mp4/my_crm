import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  assertLeadTransition,
  type LeadLifecycleState,
} from '../modules/shared/domain/lead-lifecycle';
import {
  buildAppClient,
  readFirstEdgeNode,
  readProperty,
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
  transitionLeadSchema,
  type TransitionLeadPayload,
} from '../modules/shared/logic/tool-schemas';
import { createAuditActivity } from '../modules/shared/services/audit-activity.service';

const inputSchema = {
  type: 'object',
  properties: {
    leadId: { type: 'string', description: 'Lead record id' },
    to: {
      type: 'string',
      enum: [
        'NEW',
        'RESEARCHING',
        'RESEARCHED',
        'QUALIFIED',
        'DRAFT_READY',
        'CONTACTED',
        'REPLIED',
        'MEETING',
        'WON',
        'LOST',
        'DUPLICATE',
        'DO_NOT_CONTACT',
      ],
    },
    idempotencyKey: { type: 'string' },
  },
  required: ['leadId', 'to'],
  additionalProperties: false,
} as const;

type TransitionLeadResult = ToolResult<{
  leadId: string;
  from: LeadLifecycleState;
  to: LeadLifecycleState;
  unchanged: boolean;
}>;

const handler = async (
  rawPayload: TransitionLeadPayload,
  context: LogicFunctionExecutionContext,
): Promise<TransitionLeadResult> => {
  const parsed = transitionLeadSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Lead transition input is invalid.');

  const input = parsed.data;
  const client = buildAppClient();

  try {
    const response: unknown = await client.query({
      leads: {
        __args: { filter: { id: { eq: input.leadId } }, first: 1 },
        edges: { node: { id: true, status: true } },
      },
    });
    const lead = readFirstEdgeNode(readProperty(response, 'leads'));
    const leadId = readString(lead, 'id');
    const from = readString(lead, 'status') as LeadLifecycleState | null;

    if (!leadId || !from) return notFound('Lead was not found.');
    if (from === input.to) {
      return { ok: true, leadId, from, to: input.to, unchanged: true };
    }

    try {
      assertLeadTransition(from, input.to);
    } catch (error) {
      if (error instanceof Error) return invalidState(error.message);
      return invalidState('Lead transition is not allowed.');
    }

    const updated: unknown = await client.mutation({
      updateLead: {
        __args: { id: leadId, data: { status: input.to } },
        id: true,
        status: true,
      },
    });
    const updatedLeadId = readString(readProperty(updated, 'updateLead'), 'id');
    if (!updatedLeadId) throw new Error('UPDATE_LEAD_RETURNED_NO_ID');

    await createAuditActivity(client, {
      leadId,
      name: `Lead status: ${from} -> ${input.to}`,
      type: 'STATUS_CHANGED',
      body: `Lifecycle changed from ${from} to ${input.to}.`,
      actorRole: context.workspaceMemberId ? 'HUMAN' : 'AGENT',
      actor: context.workspaceMemberId ?? 'application',
      source: 'tool.crm_transition_lead',
      idempotencyKey: input.idempotencyKey ?? `${leadId}:${from}:${input.to}`,
    });

    return { ok: true, leadId, from, to: input.to, unchanged: false };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'a8392ca4-d4b5-4622-8890-001122334466',
  name: 'crm_transition_lead',
  description:
    'Apply one legal lead lifecycle transition and record the change. This never contacts a lead.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
