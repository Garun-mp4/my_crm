import {
  buildLeadDedupeKey,
  type LeadIdentity,
} from '../shared/domain/lead-dedupe';

export type LeadImportRow = LeadIdentity & {
  sourceRowId?: number | null;
  sourceAddedAt?: string | null;
  hasWebsite?: boolean | null;
  sourceLabel?: string | null;
  source?: string | null;
  status?: string | null;
  priority?: string | null;
  sourceStatus?: string | null;
  sourcePriority?: string | null;
  outreachChannel?: string | null;
  firstMessageAt?: string | null;
  firstMessage?: string | null;
  followUpMessage2?: string | null;
  followUpMessage2At?: string | null;
  followUpMessage3?: string | null;
  followUpMessage3At?: string | null;
  replyChannel?: string | null;
  replied?: boolean | null;
  refusalReason?: string | null;
  agreed?: boolean | null;
  workStartedAt?: string | null;
  projectPrice?: number | null;
  installmentPayment?: boolean | null;
  installmentCount?: number | null;
  prepayment?: number | null;
  totalPaid?: number | null;
  remainingBalance?: number | null;
  percentPaid?: number | null;
  nextAction?: string | null;
  region?: string | null;
  reviewSignal?: string | null;
  qualificationScore?: number | null;
  fitReason?: string | null;
  websiteStatus?: string | null;
  websiteObservation?: string | null;
  proposedImprovement?: string | null;
  primarySourceUrl?: string | null;
  additionalSources?: string | null;
  verifiedFacts?: string | null;
  evidenceStrength?: string | null;
  offerAngle?: string | null;
  valueProposition?: string | null;
  followUpAngle?: string | null;
  researchedAt?: string | null;
  confidence?: string | null;
  humanizerChecked?: string | null;
  dashCheck?: string | null;
  telegramUrl?: string | null;
  telegramUsername?: string | null;
  telegramType?: string | null;
  telegramVerificationStatus?: string | null;
  telegramMessageable?: boolean | null;
  telegramEvidenceUrl?: string | null;
  telegramVerificationNotes?: string | null;
  whatsappNumber?: string | null;
  whatsappUrl?: string | null;
  whatsappVerificationStatus?: string | null;
  whatsappMessageable?: boolean | null;
  whatsappEvidenceUrl?: string | null;
  whatsappVerificationNotes?: string | null;
  messengerContactStatus?: string | null;
  preferredMessenger?: string | null;
  preferredOutreachChannel?: string | null;
  contactReadiness?: string | null;
  messengerVerificationDate?: string | null;
  messengerVerificationConfidence?: string | null;
  contactName?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  vk?: string | null;
  category?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  email?: string | null;
  phone?: string | null;
  firstContactAt?: string | null;
  lastContactAt?: string | null;
  nextActionAt?: string | null;
  score?: number | null;
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
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBoolean = (value: string | undefined): boolean | null => {
  const normalized = value?.trim().toLocaleLowerCase('ru-RU');
  if (!normalized) return null;
  if (['true', '1', 'yes', 'да'].includes(normalized)) return true;
  if (
    ['false', '0', 'no', 'нет', 'ссылка не указана', 'нет сайта'].includes(
      normalized,
    )
  )
    return false;
  return null;
};

const parseDateTime = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  if (!normalized) return null;

  const russianDate = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (russianDate) {
    const [, day, month, year] = russianDate;
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  const localDateTime = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (localDateTime) {
    const [, year, month, day, hours, minutes, seconds = '00'] = localDateTime;
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
  }

  const dateOnly = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${normalized}T00:00:00.000Z`;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizePublicUrl = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.includes('://') ? normalized : `https://${normalized}`;
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

const firstValueFrom = (
  row: Record<string, string>,
  keys: readonly string[],
): string | null => {
  for (const key of keys) {
    const value = valueFrom(row, key);
    if (value) return value;
  }

  return null;
};

const mapSource = (value: string | null): string => {
  switch (value?.toLocaleLowerCase('ru-RU')) {
    case 'яндекс карты':
    case 'yandex maps':
      return 'YANDEX_MAPS';
    case 'импорт':
    case 'import':
      return 'IMPORT';
    case 'рекомендация':
    case 'referral':
      return 'REFERRAL';
    case 'другое':
    case 'other':
      return 'OTHER';
    default:
      return 'MANUAL';
  }
};

const mapStatus = (value: string | null): string => {
  switch (value?.toLocaleLowerCase('ru-RU')) {
    case 'исследуется':
    case 'в работе':
      return 'RESEARCHING';
    case 'исследован':
      return 'RESEARCHED';
    case 'квалифицирован':
      return 'QUALIFIED';
    case 'черновик готов':
      return 'DRAFT_READY';
    case 'связались':
      return 'CONTACTED';
    case 'ответил':
    case 'ответили':
      return 'REPLIED';
    case 'встреча':
      return 'MEETING';
    case 'успешно закрыт':
    case 'выигран':
      return 'WON';
    case 'потерян':
      return 'LOST';
    case 'дубликат':
      return 'DUPLICATE';
    case 'не связываться':
      return 'DO_NOT_CONTACT';
    case 'новый':
    default:
      return 'NEW';
  }
};

const mapPriority = (value: string | null): string => {
  switch (value?.trim().toLocaleUpperCase('ru-RU')) {
    case 'A+':
      return 'URGENT';
    case 'A':
      return 'HIGH';
    case 'B+':
      return 'NORMAL';
    default:
      return 'NORMAL';
  }
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

    const category = firstValueFrom(source, ['category', 'niche']);
    const website = firstValueFrom(source, ['website', 'websiteurl']);
    const directory = firstValueFrom(source, [
      'directory',
      'directoryurl',
      'directorycardurl',
    ]);
    const sourceStatus = firstValueFrom(source, ['sourcestatus']);
    const sourcePriority = firstValueFrom(source, ['sourcepriority']);
    const firstMessageAt = parseDateTime(
      firstValueFrom(source, ['firstmessageat', 'firstcontactat']) ?? undefined,
    );
    const lastContactAt = parseDateTime(
      valueFrom(source, 'lastcontactat') ?? undefined,
    );
    const nextActionAt = parseDateTime(
      valueFrom(source, 'nextactionat') ?? undefined,
    );

    const lead: LeadImportRow = {
      name,
      city: valueFrom(source, 'city'),
      websiteUrl: normalizePublicUrl(website),
      directoryUrl: normalizePublicUrl(directory),
      category,
      source: mapSource(valueFrom(source, 'source')),
      sourceLabel: valueFrom(source, 'sourcelabel'),
      status: mapStatus(sourceStatus),
      sourceStatus,
      priority: mapPriority(sourcePriority),
      sourcePriority,
      rating: parseNumber(source.rating),
      reviewCount: parseNumber(source.reviewcount ?? source.reviews),
      email: valueFrom(source, 'email'),
      phone: valueFrom(source, 'phone'),
      contactName: valueFrom(source, 'contactname'),
      telegram: valueFrom(source, 'telegram'),
      whatsapp: valueFrom(source, 'whatsapp'),
      vk: valueFrom(source, 'vk'),
      sourceRowId: parseNumber(source.sourcerowid),
      sourceAddedAt: parseDateTime(valueFrom(source, 'sourceaddedat') ?? undefined),
      hasWebsite: parseBoolean(source.haswebsite),
      outreachChannel: valueFrom(source, 'outreachchannel'),
      firstMessageAt,
      firstContactAt: firstMessageAt,
      firstMessage: valueFrom(source, 'firstmessage'),
      followUpMessage2: valueFrom(source, 'followupmessage2'),
      followUpMessage2At: parseDateTime(
        valueFrom(source, 'followupmessage2at') ?? undefined,
      ),
      followUpMessage3: valueFrom(source, 'followupmessage3'),
      followUpMessage3At: parseDateTime(
        valueFrom(source, 'followupmessage3at') ?? undefined,
      ),
      replyChannel: valueFrom(source, 'replychannel'),
      replied: parseBoolean(source.replied),
      lastContactAt,
      refusalReason: valueFrom(source, 'refusalreason'),
      agreed: parseBoolean(source.agreed),
      workStartedAt: parseDateTime(
        valueFrom(source, 'workstartedat') ?? undefined,
      ),
      projectPrice: parseNumber(source.projectprice),
      installmentPayment: parseBoolean(source.installmentpayment),
      installmentCount: parseNumber(source.installmentcount),
      prepayment: parseNumber(source.prepayment),
      totalPaid: parseNumber(source.totalpaid),
      remainingBalance: parseNumber(source.remainingbalance),
      percentPaid: parseNumber(source.percentpaid),
      nextAction: valueFrom(source, 'nextaction'),
      nextActionAt,
      region: valueFrom(source, 'region'),
      reviewSignal: valueFrom(source, 'reviewsignal'),
      qualificationScore: parseNumber(source.qualificationscore),
      score: parseNumber(source.qualificationscore),
      fitReason: valueFrom(source, 'fitreason'),
      websiteStatus: valueFrom(source, 'websitestatus'),
      websiteObservation: valueFrom(source, 'websiteobservation'),
      proposedImprovement: valueFrom(source, 'proposedimprovement'),
      primarySourceUrl: normalizePublicUrl(
        valueFrom(source, 'primarysourceurl'),
      ),
      additionalSources: valueFrom(source, 'additionalsources'),
      verifiedFacts: valueFrom(source, 'verifiedfacts'),
      evidenceStrength: valueFrom(source, 'evidencestrength'),
      offerAngle: valueFrom(source, 'offerangle'),
      valueProposition: valueFrom(source, 'valueproposition'),
      followUpAngle: valueFrom(source, 'followupangle'),
      researchedAt: parseDateTime(
        valueFrom(source, 'researchedat') ?? undefined,
      ),
      confidence: valueFrom(source, 'confidence'),
      humanizerChecked: valueFrom(source, 'humanizerchecked'),
      dashCheck: valueFrom(source, 'dashcheck'),
      telegramUrl: normalizePublicUrl(valueFrom(source, 'telegramurl')),
      telegramUsername: valueFrom(source, 'telegramusername'),
      telegramType: valueFrom(source, 'telegramtype'),
      telegramVerificationStatus: valueFrom(
        source,
        'telegramverificationstatus',
      ),
      telegramMessageable: parseBoolean(source.telegrammessageable),
      telegramEvidenceUrl: normalizePublicUrl(
        valueFrom(source, 'telegramevidenceurl'),
      ),
      telegramVerificationNotes: valueFrom(
        source,
        'telegramverificationnotes',
      ),
      whatsappNumber: valueFrom(source, 'whatsappnumber'),
      whatsappUrl: normalizePublicUrl(valueFrom(source, 'whatsappurl')),
      whatsappVerificationStatus: valueFrom(
        source,
        'whatsappverificationstatus',
      ),
      whatsappMessageable: parseBoolean(source.whatsappmessageable),
      whatsappEvidenceUrl: normalizePublicUrl(
        valueFrom(source, 'whatsappevidenceurl'),
      ),
      whatsappVerificationNotes: valueFrom(
        source,
        'whatsappverificationnotes',
      ),
      messengerContactStatus: valueFrom(source, 'messengercontactstatus'),
      preferredMessenger: valueFrom(source, 'preferredmessenger'),
      preferredOutreachChannel: valueFrom(
        source,
        'preferredoutreachchannel',
      ),
      contactReadiness: valueFrom(source, 'contactreadiness'),
      messengerVerificationDate: parseDateTime(
        valueFrom(source, 'messengerverificationdate') ?? undefined,
      ),
      messengerVerificationConfidence: valueFrom(
        source,
        'messengerverificationconfidence',
      ),
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

    if (
      lead.rating !== null &&
      lead.rating !== undefined &&
      (lead.rating < 0 || lead.rating > 5)
    ) {
      issues.push({
        row: rowNumber,
        field: 'rating',
        message: 'Rating must be between 0 and 5',
      });
    }

    if (
      lead.reviewCount !== null &&
      lead.reviewCount !== undefined &&
      lead.reviewCount < 0
    ) {
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
