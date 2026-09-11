import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import { buildAppClient } from '../modules/shared/integrations/core-api';
import {
  logActivitySchema,
  type LogActivityPayload,
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
    name: { type: 'string' },
    type: { type: 'string' },
    body: { type: 'string' },
    idempotencyKey: { type: 'string' },
  },
  required: ['leadId', 'name', 'type', 'body', 'idempotencyKey'],
  additionalProperties: false,
} as const;

type LogActivityResult = ToolResult<{
  activityLogged: true;
  idempotencyKey: string;
}>;

const handler = async (
  rawPayload: LogActivityPayload,
  context: LogicFunctionExecutionContext,
): Promise<LogActivityResult> => {
  const parsed = logActivitySchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Activity input is invalid.');

  const input = parsed.data;
  try {
    await createAuditActivity(buildAppClient(), {
      leadId: input.leadId,
      name: input.name,
      type: input.type,
      body: input.body,
      actorRole: context.workspaceMemberId ? 'HUMAN' : 'AGENT',
      actor: context.workspaceMemberId ?? 'application',
      source: 'tool.crm_log_activity',
      idempotencyKey: input.idempotencyKey,
    });
    return {
      ok: true,
      activityLogged: true,
      idempotencyKey: input.idempotencyKey,
    };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: '39a4de15-f526-4734-a012-112233445567',
  name: 'crm_log_activity',
  description: 'Append an auditable CRM activity to a lead.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
