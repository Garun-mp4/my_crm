import { defineObject, FieldType } from 'twenty-sdk/define';

export const LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER =
  'b94a3c15-e6f7-4890-a123-556677889900';
export const LEAD_IMPORT_BATCH_NAME_FIELD_ID =
  'c05b4d26-f708-4901-b234-667788990011';
export const LEAD_IMPORT_BATCH_IDEMPOTENCY_FIELD_ID =
  'd16c5e37-0819-4012-8456-778899001122';

const option = (
  id: string,
  value: string,
  label: string,
  position: number,
  color: string,
) => ({ id, value, label, position, color });

export default defineObject({
  universalIdentifier: LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'leadImportBatch',
  namePlural: 'leadImportBatches',
  labelSingular: 'Lead import batch',
  labelPlural: 'Lead import batches',
  description: 'A reviewable and reversible CSV/XLSX-to-lead import attempt.',
  icon: 'IconFileImport',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier:
    LEAD_IMPORT_BATCH_NAME_FIELD_ID,
  fields: [
    {
      universalIdentifier: LEAD_IMPORT_BATCH_NAME_FIELD_ID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Import name',
      icon: 'IconFileSpreadsheet',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'e27d6f48-192a-4123-9567-889900112233',
      type: FieldType.SELECT,
      name: 'status',
      label: 'Import status',
      icon: 'IconProgressCheck',
      defaultValue: "'PREVIEW'",
      options: [
        option(
          'f38e7059-2a3b-4234-a678-990011223344',
          'PREVIEW',
          'Preview',
          0,
          'blue',
        ),
        option(
          'a49f816a-3b4c-4345-b789-001122334455',
          'COMMITTED',
          'Committed',
          1,
          'green',
        ),
        option(
          'b5a0927b-4c5d-4456-8980-112233445566',
          'PARTIAL',
          'Partial',
          2,
          'orange',
        ),
        option(
          'c6b1a38c-5d6e-4567-9a01-223344556677',
          'FAILED',
          'Failed',
          3,
          'red',
        ),
        option(
          'd7c2b49d-6e7f-4678-a012-334455667788',
          'ROLLED_BACK',
          'Rolled back',
          4,
          'gray',
        ),
      ],
    },
    {
      universalIdentifier: 'e8d3c50e-7f80-4789-b123-445566778899',
      type: FieldType.TEXT,
      name: 'sourceHash',
      label: 'Source hash',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'f9e4d61f-8091-4890-a234-556677889900',
      type: FieldType.NUMBER,
      name: 'totalRows',
      label: 'Total rows',
      icon: 'IconListNumbers',
      isNullable: true,
    },
    {
      universalIdentifier: '0a5e7a20-91a2-4901-8456-667788990011',
      type: FieldType.NUMBER,
      name: 'acceptedRows',
      label: 'Accepted rows',
      icon: 'IconCheck',
      isNullable: true,
    },
    {
      universalIdentifier: '1b6f8b31-a2b3-4012-9567-778899001122',
      type: FieldType.NUMBER,
      name: 'duplicateRows',
      label: 'Duplicate rows',
      icon: 'IconCopy',
      isNullable: true,
    },
    {
      universalIdentifier: '2c709c42-b3c4-4123-a678-889900112233',
      type: FieldType.NUMBER,
      name: 'rejectedRows',
      label: 'Rejected rows',
      icon: 'IconAlertTriangle',
      isNullable: true,
    },
    {
      universalIdentifier: '3d81ad53-c4d5-4234-b789-990011223344',
      type: FieldType.RAW_JSON,
      name: 'createdLeadIds',
      label: 'Created lead ids',
      icon: 'IconListDetails',
      isNullable: true,
    },
    {
      universalIdentifier: '4e92be64-d5e6-4345-8a01-001122334455',
      type: FieldType.RAW_JSON,
      name: 'errorReport',
      label: 'Error report',
      icon: 'IconReportAnalytics',
      isNullable: true,
    },
    {
      universalIdentifier: LEAD_IMPORT_BATCH_IDEMPOTENCY_FIELD_ID,
      type: FieldType.TEXT,
      name: 'idempotencyKey',
      label: 'Idempotency key',
      icon: 'IconFingerprint',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier: '7c2d3e4f-5061-4728-8394-001122334455',
      type: FieldType.TEXT,
      name: 'idempotencyPayloadHash',
      label: 'Idempotency payload hash',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: '5fa3cf75-e6f7-4456-9b12-112233445566',
      type: FieldType.DATE_TIME,
      name: 'committedAt',
      label: 'Committed at',
      icon: 'IconClockCheck',
      isNullable: true,
    },
    {
      universalIdentifier: '6ab4d086-f708-4567-a123-223344556677',
      type: FieldType.DATE_TIME,
      name: 'rolledBackAt',
      label: 'Rolled back at',
      icon: 'IconArrowBackUp',
      isNullable: true,
    },
  ],
});
