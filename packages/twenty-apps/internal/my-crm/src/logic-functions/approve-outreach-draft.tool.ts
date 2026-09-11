import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  buildAppClient,
  readFirstEdgeNode,
  readProperty,
  readString,
  requireWorkspaceMember,
} from '../modules/shared/integrations/core-api';
import {
  approveOutreachDraftSchema,
  type ApproveOutreachDraftPayload,
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
    draftId: { type: 'string', description: 'Outreach draft record id' },
    approvalNote: {
      type: 'string',
      description: 'Optional human approval note',
    },
  },
  required: ['draftId'],
  additionalProperties: false,
} as const;

type ApproveOutreachDraftResult = ToolResult<{
  draftId: string;
  approvedBy: string;
}>;

const handler = async (
  rawPayload: ApproveOutreachDraftPayload,
  context: LogicFunctionExecutionContext,
): Promise<ApproveOutreachDraftResult> => {
  const parsed = approveOutreachDraftSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Approval input is invalid.');

  let approvedBy: string;
  try {
    approvedBy = requireWorkspaceMember(context.workspaceMemberId);
  } catch {
    return {
      ok: false,
      code: 'AUTHENTICATED_MEMBER_REQUIRED',
      message: 'Only an authenticated workspace member can approve a draft.',
    };
  }

  const client = buildAppClient();

  try {
    const response: unknown = await client.query({
      outreachDrafts: {
        __args: { filter: { id: { eq: parsed.data.draftId } }, first: 1 },
        edges: { node: { id: true, status: true, leadId: true } },
      },
    });
    const draft = readFirstEdgeNode(readProperty(response, 'outreachDrafts'));
    const draftId = readString(draft, 'id');
    const leadId = readString(draft, 'leadId');
    const status = readString(draft, 'status');
    if (!draftId || !leadId) {
      return {
        ok: false,
        code: 'NOT_FOUND',
        message: 'Outreach draft was not found.',
      };
    }
    if (status !== 'NEEDS_REVIEW') {
      return {
        ok: false,
        code: 'INVALID_STATE',
        message: 'Only drafts waiting for review can be approved.',
      };
    }

    await client.mutation({
      updateOutreachDraft: {
        __args: {
          id: draftId,
          data: {
            status: 'APPROVED',
            approvedAt: new Date().toISOString(),
            approvedBy,
          },
        },
        id: true,
        status: true,
      },
    });

    await createAuditActivity(client, {
      leadId,
      name: 'Outreach draft approved',
      type: 'DRAFT_APPROVED',
      body:
        parsed.data.approvalNote ??
        'Approved by an authenticated workspace member.',
      actorRole: 'HUMAN',
      actor: approvedBy,
      source: 'tool.crm_approve_outreach_draft',
      idempotencyKey: `approval:${draftId}:${approvedBy}`,
    });

    return { ok: true, draftId, approvedBy };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: '2893cd04-e415-4623-9890-001122334456',
  name: 'crm_approve_outreach_draft',
  description:
    'Approve an outreach draft as a human. This does not send the message.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
