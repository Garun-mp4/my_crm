import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  planLeadCsvImport,
  type LeadImportIssue,
} from '../modules/import/lead-csv-import';
import { findExistingLeadDedupeKeys } from '../modules/import/lead-import-core';
import { buildAppClient } from '../modules/shared/integrations/core-api';
import { sha256Hex } from '../modules/shared/integrations/hash';
import {
  invalidInput,
  operationFailure,
  type ToolResult,
} from '../modules/shared/logic/tool-result';
import {
  previewLeadImportSchema,
  type PreviewLeadImportPayload,
} from '../modules/shared/logic/tool-schemas';

const inputSchema = {
  type: 'object',
  properties: {
    csv: {
      type: 'string',
      description:
        'CSV content with a header row from the current lead tracker',
    },
  },
  required: ['csv'],
  additionalProperties: false,
} as const;

type PreviewLeadImportResult = ToolResult<{
  sourceHash: string;
  totalRows: number;
  acceptedRows: number;
  duplicateRows: number;
  rejectedRows: number;
  issues: LeadImportIssue[];
}>;

const handler = async (
  rawPayload: PreviewLeadImportPayload,
  _context: LogicFunctionExecutionContext,
): Promise<PreviewLeadImportResult> => {
  const parsed = previewLeadImportSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Import preview input is invalid.');

  try {
    const client = buildAppClient();
    const initialPlan = planLeadCsvImport(parsed.data.csv);
    const existingDedupeKeys = await findExistingLeadDedupeKeys(
      client,
      initialPlan.dedupeKeys,
    );
    const plan = planLeadCsvImport(parsed.data.csv, { existingDedupeKeys });

    return {
      ok: true,
      sourceHash: sha256Hex(parsed.data.csv),
      totalRows:
        plan.rows.length + plan.rejectedRows.filter((row) => !row.row).length,
      acceptedRows: plan.acceptedRows.length,
      duplicateRows: plan.duplicateRows.length,
      rejectedRows: plan.rejectedRows.length,
      issues: plan.issues,
    };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'b94a3c15-e6f7-4890-a123-556677889901',
  name: 'crm_preview_lead_import',
  description:
    'Preview a CSV lead import with validation and workspace duplicate detection. This never writes records.',
  timeoutSeconds: 30,
  handler,
  toolTriggerSettings: { inputSchema },
});
