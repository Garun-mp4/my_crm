import {
  buildLeadDedupeKey,
  type LeadIdentity,
} from '../shared/domain/lead-dedupe';

export type LeadImportRow = LeadIdentity & {
  category?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type LeadImportIssue = {
  row: number;
  field: string;
  message: string;
};

export type LeadImportResult = {
  rows: LeadImportRow[];
  issues: LeadImportIssue[];
  dedupeKeys: string[];
  rowNumbers: number[];
};

const parseNumber = (value: string | undefined): number | null => {
  if (!value?.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCsvRecords = (csv: string): string[][] => {
  const records: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];

    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === ',' && !quoted) {
      row.push(current);
      current = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(current);
      if (row.some((cell) => cell.trim().length > 0)) records.push(row);
      row = [];
      current = '';
      continue;
    }

    current += character;
  }

  row.push(current);
  if (row.some((cell) => cell.trim().length > 0)) records.push(row);
  return records;
};

const valueFrom = (row: Record<string, string>, key: string): string | null => {
  const value = row[key];
  return value?.trim() ? value.trim() : null;
};

export const parseLeadCsv = (csv: string): LeadImportResult => {
  const records = parseCsvRecords(csv);
  const header =
    records.shift()?.map((value) => value.trim().toLocaleLowerCase('ru-RU')) ??
    [];
  const rows: LeadImportRow[] = [];
  const issues: LeadImportIssue[] = [];
  const rowNumbers: number[] = [];

  records.forEach((values, index) => {
    const rowNumber = index + 2;
    const source = Object.fromEntries(
      header.map((key, column) => [key, values[column] ?? '']),
    );
    const name =
      valueFrom(source, 'name') ?? valueFrom(source, 'company') ?? '';

    if (name.length === 0) {
      issues.push({
        row: rowNumber,
        field: 'name',
        message: 'Company name is required',
      });
      return;
    }

    const lead: LeadImportRow = {
      name,
      city: valueFrom(source, 'city'),
      websiteUrl:
        valueFrom(source, 'website') ?? valueFrom(source, 'websiteurl'),
      directoryUrl:
        valueFrom(source, 'directory') ?? valueFrom(source, 'directoryurl'),
      category: valueFrom(source, 'category'),
      rating: parseNumber(source.rating),
      reviewCount: parseNumber(source.reviewcount ?? source.reviews),
      email: valueFrom(source, 'email'),
      phone: valueFrom(source, 'phone'),
      notes: valueFrom(source, 'notes'),
    };

    if (valueFrom(source, 'rating') && lead.rating === null) {
      issues.push({
        row: rowNumber,
        field: 'rating',
        message: 'Rating must be a number',
      });
    }

    const reviewCountValue =
      valueFrom(source, 'reviewcount') ?? valueFrom(source, 'reviews');
    if (reviewCountValue && lead.reviewCount === null) {
      issues.push({
        row: rowNumber,
        field: 'reviewCount',
        message: 'Review count must be a number',
      });
    }

    if (lead.rating !== null && (lead.rating < 0 || lead.rating > 5)) {
      issues.push({
        row: rowNumber,
        field: 'rating',
        message: 'Rating must be between 0 and 5',
      });
    }

    if (lead.reviewCount !== null && lead.reviewCount < 0) {
      issues.push({
        row: rowNumber,
        field: 'reviewCount',
        message: 'Review count cannot be negative',
      });
    }

    rows.push(lead);
    rowNumbers.push(rowNumber);
  });

  return {
    rows,
    issues,
    dedupeKeys: rows.map((row) => buildLeadDedupeKey(row)),
    rowNumbers,
  };
};

export type LeadImportPlan = LeadImportResult & {
  acceptedRows: Array<{
    row: LeadImportRow;
    rowNumber: number;
    dedupeKey: string;
  }>;
  rejectedRows: Array<{
    row: LeadImportRow | null;
    rowNumber: number;
    issues: LeadImportIssue[];
  }>;
  duplicateRows: number[];
};

export const planLeadCsvImport = (
  csv: string,
  options: { existingDedupeKeys?: ReadonlySet<string> } = {},
): LeadImportPlan => {
  const parsed = parseLeadCsv(csv);
  const issues = [...parsed.issues];
  const duplicateRows: number[] = [];
  const firstRowByDedupeKey = new Map<string, number>();

  parsed.dedupeKeys.forEach((dedupeKey, index) => {
    const rowNumber = parsed.rowNumbers[index] ?? index + 2;
    const firstRow = firstRowByDedupeKey.get(dedupeKey);

    if (firstRow !== undefined) {
      duplicateRows.push(rowNumber);
      issues.push({
        row: rowNumber,
        field: 'dedupeKey',
        message: `Duplicate of row ${firstRow} in this file`,
      });
    } else {
      firstRowByDedupeKey.set(dedupeKey, rowNumber);
    }

    if (options.existingDedupeKeys?.has(dedupeKey)) {
      duplicateRows.push(rowNumber);
      issues.push({
        row: rowNumber,
        field: 'dedupeKey',
        message: 'Lead already exists in the workspace',
      });
    }
  });

  const issuesByRow = new Map<number, LeadImportIssue[]>();
  for (const issue of issues) {
    const rowIssues = issuesByRow.get(issue.row) ?? [];
    rowIssues.push(issue);
    issuesByRow.set(issue.row, rowIssues);
  }

  const acceptedRows: LeadImportPlan['acceptedRows'] = [];
  const rejectedRows: LeadImportPlan['rejectedRows'] = [];

  parsed.rows.forEach((row, index) => {
    const rowNumber = parsed.rowNumbers[index] ?? index + 2;
    const rowIssues = issuesByRow.get(rowNumber) ?? [];
    const dedupeKey = parsed.dedupeKeys[index] ?? buildLeadDedupeKey(row);

    if (rowIssues.length > 0) {
      rejectedRows.push({ row, rowNumber, issues: rowIssues });
      return;
    }

    acceptedRows.push({ row, rowNumber, dedupeKey });
  });

  for (const [rowNumber, rowIssues] of issuesByRow) {
    if (!parsed.rowNumbers.includes(rowNumber)) {
      rejectedRows.push({ row: null, rowNumber, issues: rowIssues });
    }
  }

  return {
    ...parsed,
    issues,
    acceptedRows,
    rejectedRows: rejectedRows.sort(
      (left, right) => left.rowNumber - right.rowNumber,
    ),
    duplicateRows: [...new Set(duplicateRows)].sort(
      (left, right) => left - right,
    ),
  };
};
