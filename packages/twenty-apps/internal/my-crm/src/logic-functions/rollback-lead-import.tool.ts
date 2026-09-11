import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  buildAppClient,
  readEdges,
  readProperty,
  readString,
  requireWorkspaceMember,
} from '../modules/shared/integrations/core-api';
import {
  invalidInput,
  invalidState,
  notFound,
  operationFailure,
  type ToolResult,
} from '../modules/shared/logic/tool-result';
import {
  rollbackLeadImportSchema,
  type RollbackLeadImportPayload,
} from '../modules/shared/logic/tool-schemas';
import { createAuditActivity } from '../modules/shared/services/audit-activity.service';

const inputSchema = {
  type: 'object',
  properties: {
    batchId: { type: 'string', description: 'Tracked import batch id' },
    confirm: {
      type: 'boolean',
      const: true,
      description: 'Explicitly confirm soft-deleting the batch-created leads',
    },
  },
  required: ['batchId', 'confirm'],
  additionalProperties: false,
} as const;

type RollbackLeadImportResult = ToolResult<{
  batchId: string;
  status: 'ROLLED_BACK' | 'PARTIAL';
  rolledBackLeadIds: string[];
  failedLeadIds: string[];
}>;

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const handler = async (
  rawPayload: RollbackLeadImportPayload,
  context: LogicFunctionExecutionContext,
): Promise<RollbackLeadImportResult> => {
  const parsed = rollbackLeadImportSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Import rollback input is invalid.');

  let actor: string;
  try {
    actor = requireWorkspaceMember(context.workspaceMemberId);
  } catch {
    return {
      ok: false,
      code: 'AUTHENTICATED_MEMBER_REQUIRED',
      message:
        'Only an authenticated workspace member can roll back an import.',
    };
  }

  const client = buildAppClient();

  try {
    const response: unknown = await client.query({
      leadImportBatches: {
        __args: { filter: { id: { eq: parsed.data.batchId } }, first: 1 },
        edges: { node: { id: true, status: true, createdLeadIds: true } },
      },
    });
    const batch = readEdges(readProperty(response, 'leadImportBatches'))[0];
    const batchId = readString(batch, 'id');
    const status = readString(batch, 'status');
    const createdLeadIds = readStringArray(
      readProperty(batch, 'createdLeadIds'),
    );

    if (!batchId) return notFound('Import batch was not found.');
    if (status === 'ROLLED_BACK') {
      return {
        ok: true,
        batchId,
        status: 'ROLLED_BACK',
        rolledBackLeadIds: [],
        failedLeadIds: [],
      };
    }
    if (status !== 'COMMITTED' && status !== 'PARTIAL') {
      return invalidState(
        'Only a committed or partial import can be rolled back.',
      );
    }

    const rolledBackLeadIds: string[] = [];
    const failedLeadIds: string[] = [];

    for (const leadId of createdLeadIds) {
      try {
        await createAuditActivity(client, {
          leadId,
          name: 'Import rollback requested',
          type: 'NOTE',
          body: `Lead was selected for soft-delete during import rollback by ${actor}.`,
          actorRole: 'HUMAN',
          actor,
          source: 'tool.crm_rollback_import',
          idempotencyKey: `rollback:${batchId}:${leadId}`,
        });
        await client.mutation({
          deleteLead: { __args: { id: leadId }, id: true },
        });
        rolledBackLeadIds.push(leadId);
      } catch {
        failedLeadIds.push(leadId);
      }
    }

    const nextStatus = failedLeadIds.length > 0 ? 'PARTIAL' : 'ROLLED_BACK';
    await client.mutation({
      updateLeadImportBatch: {
        __args: {
          id: batchId,
          data: {
            status: nextStatus,
            createdLeadIds: failedLeadIds,
            rolledBackAt: new Date().toISOString(),
          },
        },
        id: true,
        status: true,
      },
    });

    return {
      ok: true,
      batchId,
      status: nextStatus,
      rolledBackLeadIds,
      failedLeadIds,
    };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'd16c5e37-0819-4012-8456-778899001123',
  name: 'crm_rollback_import',
  description:
    'Soft-delete leads created by one tracked import. Human approval is required and no unrelated lead may be selected by the tool.',
  timeoutSeconds: 120,
  handler,
  toolTriggerSettings: { inputSchema },
});
