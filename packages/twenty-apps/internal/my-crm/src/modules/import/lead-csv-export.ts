export type LeadExportRecord = {
  id: string;
  name: string;
  city?: string | null;
  category?: string | null;
  websiteUrl?: string | null;
  directoryUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  researchStatus?: string | null;
  firstContactAt?: string | null;
  lastContactAt?: string | null;
  nextActionAt?: string | null;
  notes?: string | null;
};

const EXPORT_COLUMNS: Array<keyof LeadExportRecord> = [
  'id',
  'name',
  'city',
  'category',
  'websiteUrl',
  'directoryUrl',
  'rating',
  'reviewCount',
  'email',
  'phone',
  'status',
  'researchStatus',
  'firstContactAt',
  'lastContactAt',
  'nextActionAt',
  'notes',
];

const escapeCsvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const exportLeadsToCsv = (
  records: readonly LeadExportRecord[],
): string => {
  const header = EXPORT_COLUMNS.join(',');
  const rows = records.map((record) =>
    EXPORT_COLUMNS.map((column) => escapeCsvCell(record[column])).join(','),
  );

  return [header, ...rows].join('\r\n');
};
