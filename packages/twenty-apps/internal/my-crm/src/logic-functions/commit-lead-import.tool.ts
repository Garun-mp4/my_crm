import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  planLeadCsvImport,
  type LeadImportIssue,
} from '../modules/import/lead-csv-import';
import {
  buildLeadImportData,
  findExistingLeadDedupeKeys,
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
  commitLeadImportSchema,
  type CommitLeadImportPayload,
} from '../modules/shared/logic/tool-schemas';
import { createAuditActivity } from '../modules/shared/services/audit-activity.service';

const inputSchema = {
  type: 'object',
  properties: {
    csv: { type: 'string', description: 'CSV content to import' },
    fileName: {
      type: 'string',
      description: 'Human-readable source file name',
    },
    idempotencyKey: {
      type: 'string',
      description: 'Stable key for retrying the same import safely',
    },
    confirm: {
      type: 'boolean',
      const: true,
      description: 'Explicitly confirm writing only the valid rows',
    },
  },
  required: ['csv', 'fileName', 'idempotencyKey', 'confirm'],
  additionalProperties: false,
} as const;

type CommitLeadImportResult = ToolResult<{
  batchId: string;
  status: 'COMMITTED' | 'PARTIAL' | 'FAILED';
  createdLeadIds: string[];
  duplicateRows: number[];
  rejectedRows: number[];
  failedRows: number[];
}>;

type ExistingBatch = {
  id: string;
  status: string | null;
  createdLeadIds: string[];
  idempotencyPayloadHash: string | null;
};

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const findExistingBatch = async (
  client: ReturnType<typeof buildAppClient>,
  idempotencyKey: string,
): Promise<ExistingBatch | null> => {
  const response: unknown = await client.query({
    leadImportBatches: {
      __args: { filter: { idempotencyKey: { eq: idempotencyKey } }, first: 1 },
      edges: {
        node: {
          id: true,
          status: true,
          createdLeadIds: true,
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
    idempotencyPayloadHash: readString(batch, 'idempotencyPayloadHash'),
  };
};

const handler = async (
  rawPayload: CommitLeadImportPayload,
  context: LogicFunctionExecutionContext,
): Promise<CommitLeadImportResult> => {
  const parsed = commitLeadImportSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Import commit input is invalid.');

  const input = parsed.data;
  const client = buildAppClient();
  const idempotencyPayloadHash = buildIdempotencyPayloadHash(
    'crm_import_leads',
    { ...input, idempotencyKey: undefined },
  );

  try {
    const existingBatch = await findExistingBatch(client, input.idempotencyKey);
    if (existingBatch) {
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
        duplicateRows: [],
        rejectedRows: [],
        failedRows: [],
      };
    }

    const initialPlan = planLeadCsvImport(input.csv);
    const existingDedupeKeys = await findExistingLeadDedupeKeys(
      client,
      initialPlan.dedupeKeys,
    );
    const plan = planLeadCsvImport(input.csv, { existingDedupeKeys });
    const sourceHash = sha256Hex(input.csv);
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
    const batchId = readString(
      readProperty(batchResponse, 'createLeadImportBatch'),
      'id',
    );
    if (!batchId) throw new Error('CREATE_IMPORT_BATCH_RETURNED_NO_ID');

    const createdLeadIds: string[] = [];
    const failedRows: number[] = [];
    const failedIssues: LeadImportIssue[] = [];

    for (const entry of plan.acceptedRows) {
      try {
        const response: unknown = await client.mutation({
          createLead: {
            __args: {
              data: {
                ...buildLeadImportData(entry.row, entry.dedupeKey),
                status: 'NEW',
              },
            },
            id: true,
          },
        });
        const leadId = readString(readProperty(response, 'createLead'), 'id');
        if (!leadId) throw new Error('CREATE_IMPORTED_LEAD_RETURNED_NO_ID');
        createdLeadIds.push(leadId);

        await createAuditActivity(client, {
          leadId,
          name: `Lead imported: ${entry.row.name}`,
          type: 'NOTE',
          body: `Imported from ${input.fileName}. Batch ${batchId}.`,
          actorRole: context.workspaceMemberId ? 'HUMAN' : 'AGENT',
          actor: context.workspaceMemberId ?? 'application',
          source: 'tool.crm_import_leads',
          idempotencyKey: `import:${input.idempotencyKey}:${entry.dedupeKey}`,
        });
      } catch {
        failedRows.push(entry.rowNumber);
        failedIssues.push({
          row: entry.rowNumber,
          field: 'row',
          message:
            'The row could not be committed; inspect the batch error report.',
        });
      }
    }

    const status =
      failedRows.length === 0
        ? 'COMMITTED'
        : createdLeadIds.length > 0
          ? 'PARTIAL'
          : 'FAILED';
    const errorReport = [...plan.issues, ...failedIssues];

    await client.mutation({
      updateLeadImportBatch: {
        __args: {
          id: batchId,
          data: {
            status,
            createdLeadIds,
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
      createdLeadIds,
      duplicateRows: plan.duplicateRows,
      rejectedRows: plan.rejectedRows.map((row) => row.rowNumber),
      failedRows,
    };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'c05b4d26-f708-4901-b234-667788990012',
  name: 'crm_import_leads',
  description:
    'Commit only valid, non-duplicate CSV rows into a tracked import batch. Requires explicit confirmation and never contacts a lead.',
  timeoutSeconds: 120,
  handler,
  toolTriggerSettings: { inputSchema },
});
