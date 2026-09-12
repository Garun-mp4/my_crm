import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  planLeadCsvImport,
  type LeadImportIssue,
} from '../modules/import/lead-csv-import';
import {
  buildLeadImportData,
  findExistingLeadRecords,
} from '../modules/import/lead-import-core';
import {
  buildAppClient,
  readEdges,
  readProperty,
  readString,
} from '../modules/shared/integrations/core-api';
import { sha256Hex } from '../modules/shared/integrations/hash';
import {
  assertIdempotencyPayloadMatches,
  buildIdempotencyPayloadHash,
} from '../modules/shared/integrations/idempotency';
import {
  invalidInput,
  operationFailure,
  type ToolResult,
} from '../modules/shared/logic/tool-result';
import {
  syncLeadTrackerSchema,
  type SyncLeadTrackerPayload,
} from '../modules/shared/logic/tool-schemas';
import { createAuditActivity } from '../modules/shared/services/audit-activity.service';

const inputSchema = {
  type: 'object',
  properties: {
    csv: {
      type: 'string',
      description: 'Normalized CSV content exported from the lead tracker',
    },
    fileName: {
      type: 'string',
      description: 'Human-readable source workbook name',
    },
    idempotencyKey: {
      type: 'string',
      description: 'Stable key for retrying the same synchronization safely',
    },
    confirm: {
      type: 'boolean',
      const: true,
      description: 'Explicitly confirm updating or creating the valid rows',
    },
  },
  required: ['csv', 'fileName', 'idempotencyKey', 'confirm'],
  additionalProperties: false,
} as const;

type SyncLeadTrackerResult = ToolResult<{
  batchId: string;
  status: 'COMMITTED' | 'PARTIAL' | 'FAILED';
  createdLeadIds: string[];
  updatedLeadIds: string[];
  rejectedRows: number[];
  failedRows: number[];
}>;

type ExistingSyncBatch = {
  id: string;
  status: string | null;
  createdLeadIds: string[];
  updatedLeadIds: string[];
  idempotencyPayloadHash: string | null;
};

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const findExistingSyncBatch = async (
  client: ReturnType<typeof buildAppClient>,
  idempotencyKey: string,
): Promise<ExistingSyncBatch | null> => {
  const response: unknown = await client.query({
    leadImportBatches: {
      __args: { filter: { idempotencyKey: { eq: idempotencyKey } }, first: 1 },
      edges: {
        node: {
          id: true,
          status: true,
          createdLeadIds: true,
          updatedLeadIds: true,
          idempotencyPayloadHash: true,
        },
      },
    },
  });
  const batch = readEdges(readProperty(response, 'leadImportBatches'))[0];
  const id = readString(batch, 'id');
  if (!id) return null;

  return {
    id,
    status: readString(batch, 'status'),
    createdLeadIds: readStringArray(readProperty(batch, 'createdLeadIds')),
    updatedLeadIds: readStringArray(readProperty(batch, 'updatedLeadIds')),
    idempotencyPayloadHash: readString(batch, 'idempotencyPayloadHash'),
  };
};

const handler = async (
  rawPayload: SyncLeadTrackerPayload,
  context: LogicFunctionExecutionContext,
): Promise<SyncLeadTrackerResult> => {
  const parsed = syncLeadTrackerSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Lead tracker synchronization input is invalid.');

  const input = parsed.data;
  const client = buildAppClient();
  const idempotencyPayloadHash = buildIdempotencyPayloadHash(
    'crm_sync_lead_tracker',
    { ...input, idempotencyKey: undefined },
  );

  try {
    const existingBatch = await findExistingSyncBatch(
      client,
      input.idempotencyKey,
    );
    if (existingBatch && existingBatch.status === 'COMMITTED') {
      assertIdempotencyPayloadMatches(
        existingBatch.idempotencyPayloadHash,
        idempotencyPayloadHash,
      );
      const status =
        existingBatch.status === 'COMMITTED' ||
        existingBatch.status === 'PARTIAL' ||
        existingBatch.status === 'FAILED'
          ? existingBatch.status
          : 'FAILED';
      return {
        ok: true,
        batchId: existingBatch.id,
        status,
        createdLeadIds: existingBatch.createdLeadIds,
        updatedLeadIds: existingBatch.updatedLeadIds,
        rejectedRows: [],
        failedRows: [],
      };
    }
    if (existingBatch) {
      assertIdempotencyPayloadMatches(
        existingBatch.idempotencyPayloadHash,
        idempotencyPayloadHash,
      );
    }

    const plan = planLeadCsvImport(input.csv);
    const existingLeads = await findExistingLeadRecords(
      client,
      plan.rows,
    );
    const sourceHash = sha256Hex(input.csv);
    let batchId = existingBatch?.id ?? null;
    if (!batchId) {
      const batchResponse: unknown = await client.mutation({
        createLeadImportBatch: {
          __args: {
            data: {
              name: input.fileName,
              status: 'PREVIEW',
              sourceHash,
              totalRows:
                plan.rows.length +
                plan.rejectedRows.filter((row) => !row.row).length,
              acceptedRows: plan.acceptedRows.length,
              duplicateRows: plan.duplicateRows.length,
              rejectedRows: plan.rejectedRows.length,
              errorReport: plan.issues,
              idempotencyKey: input.idempotencyKey,
              idempotencyPayloadHash,
            },
          },
          id: true,
        },
      });
      batchId = readString(
        readProperty(batchResponse, 'createLeadImportBatch'),
        'id',
      );
      if (!batchId) throw new Error('CREATE_SYNC_BATCH_RETURNED_NO_ID');
    }

    const createdLeadIds = new Set(existingBatch?.createdLeadIds ?? []);
    const updatedLeadIds = new Set(existingBatch?.updatedLeadIds ?? []);
    const failedRows: number[] = [];
    const failedIssues: LeadImportIssue[] = [];

    for (const entry of plan.acceptedRows) {
      try {
        const existingLeadId = existingLeads.get(entry.dedupeKey);
        const data = buildLeadImportData(
          entry.row,
          existingLeadId ? undefined : entry.dedupeKey,
        );
        const response: unknown = existingLeadId
          ? await client.mutation({
              updateLead: {
                __args: { id: existingLeadId, data },
                id: true,
              },
            })
          : await client.mutation({
              createLead: {
                __args: { data },
                id: true,
              },
            });
        const mutationName = existingLeadId ? 'updateLead' : 'createLead';
        const leadId = readString(readProperty(response, mutationName), 'id');
        if (!leadId) throw new Error('SYNC_LEAD_MUTATION_RETURNED_NO_ID');

        if (existingLeadId) updatedLeadIds.add(leadId);
        else createdLeadIds.add(leadId);

        await createAuditActivity(client, {
          leadId,
          name: existingLeadId
            ? `Lead synchronized: ${entry.row.name}`
            : `Lead imported: ${entry.row.name}`,
          type: 'NOTE',
          body: `${existingLeadId ? 'Synchronized' : 'Imported'} from ${input.fileName}. Batch ${batchId}.`,
          actorRole: context.workspaceMemberId ? 'HUMAN' : 'SYSTEM',
          actor: context.workspaceMemberId ?? 'application',
          source: 'tool.crm_sync_lead_tracker',
          idempotencyKey: `sync:${input.idempotencyKey}:${entry.dedupeKey}`,
        });
      } catch (error) {
        failedRows.push(entry.rowNumber);
        const reason = error instanceof Error ? error.message : String(error);
        failedIssues.push({
          row: entry.rowNumber,
          field: 'row',
          message: `The row could not be synchronized: ${reason}`,
        });
      }
    }

    const status =
      failedRows.length === 0
        ? 'COMMITTED'
        : createdLeadIds.size + updatedLeadIds.size > 0
          ? 'PARTIAL'
          : 'FAILED';
    const errorReport = [...plan.issues, ...failedIssues];

    await client.mutation({
      updateLeadImportBatch: {
        __args: {
          id: batchId,
          data: {
            status,
            createdLeadIds: [...createdLeadIds],
            updatedLeadIds: [...updatedLeadIds],
            errorReport,
            committedAt: new Date().toISOString(),
          },
        },
        id: true,
        status: true,
      },
    });

    return {
      ok: true,
      batchId,
      status,
      createdLeadIds: [...createdLeadIds],
      updatedLeadIds: [...updatedLeadIds],
      rejectedRows: plan.rejectedRows.map((row) => row.rowNumber),
      failedRows,
    };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'e1b2c3d4-5f60-4789-a012-334455667788',
  name: 'crm_sync_lead_tracker',
  description:
    'Synchronize a normalized lead tracker export into the CRM by dedupe key, updating existing leads without creating duplicates.',
  timeoutSeconds: 120,
  handler,
  toolTriggerSettings: { inputSchema },
});
