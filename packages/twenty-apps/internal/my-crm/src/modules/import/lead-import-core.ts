import { domainToUnicode } from 'node:url';
import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  buildLeadDedupeKey,
  canonicalizeDirectoryUrl,
  canonicalizeText,
  canonicalizeUrl,
} from '../shared/domain/lead-dedupe';
import {
  readProperty,
  readRecord,
  toRichTextValue,
} from '../shared/integrations/core-api';
import { type LeadImportRow } from './lead-csv-import';

const LEADS_PAGE_SIZE = 500;
const LEAD_FILTER_BATCH_SIZE = 50;
const DEDUPE_KEY_BATCH_SIZE = 500;
export const MAX_LEAD_FILTER_PAYLOAD_BYTES = 128 * 1024;

const measureSerializedPayload = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value) ?? '').byteLength;

const buildDedupeKeyBatches = (
  dedupeKeys: readonly string[],
): string[][] => {
  const batches: string[][] = [];
  let currentKeys: string[] = [];

  for (const dedupeKey of dedupeKeys) {
    const candidateKeys = [...currentKeys, dedupeKey];
    const candidateFilter = { dedupeKey: { in: candidateKeys } };
    const exceedsRowLimit = candidateKeys.length > DEDUPE_KEY_BATCH_SIZE;
    const exceedsPayloadLimit =
      measureSerializedPayload(candidateFilter) >
      MAX_LEAD_FILTER_PAYLOAD_BYTES;

    if (currentKeys.length > 0 && (exceedsRowLimit || exceedsPayloadLimit)) {
      batches.push(currentKeys);
      currentKeys = [dedupeKey];

      if (
        measureSerializedPayload({ dedupeKey: { in: currentKeys } }) >
        MAX_LEAD_FILTER_PAYLOAD_BYTES
      ) {
        throw new Error('Lead identity filter payload is too large.');
      }
      continue;
    }

    if (exceedsPayloadLimit) {
      throw new Error('Lead identity filter payload is too large.');
    }

    currentKeys = candidateKeys;
  }

  if (currentKeys.length > 0) batches.push(currentKeys);

  return batches;
};

export const findExistingLeadDedupeKeys = async (
  client: CoreApiClient,
  dedupeKeys: readonly string[],
): Promise<Set<string>> => {
  if (dedupeKeys.length === 0) return new Set();

  const uniqueDedupeKeys = [...new Set(dedupeKeys)];
  const requestedDedupeKeys = new Set(uniqueDedupeKeys);
  const existingDedupeKeys = new Set<string>();

  for (const queriedDedupeKeys of buildDedupeKeyBatches(uniqueDedupeKeys)) {
    const response: unknown = await client.query({
      leads: {
        __args: {
          filter: { dedupeKey: { in: queriedDedupeKeys } },
          first: queriedDedupeKeys.length,
        },
        edges: { node: { dedupeKey: true } },
      },
    });

    for (const lead of readLeadNodes(readProperty(response, 'leads'))) {
      const key = readNullableStringField(lead, 'dedupeKey');
      if (key && requestedDedupeKeys.has(key)) existingDedupeKeys.add(key);
    }
  }

  return existingDedupeKeys;
};

type ExistingLead = {
  id: string;
  dedupeKey: string | null;
  name: string;
  city: string | null;
  websiteUrl: string | null;
  directoryUrl: string | null;
};

type LeadFilter = Record<string, unknown>;

type LeadPage = {
  nodes: Record<string, unknown>[];
  hasNextPage: boolean;
  endCursor: string | null;
};

const INVALID_LEAD_LOOKUP_RESPONSE = 'Lead lookup response is invalid.';
const INVALID_LEAD_PAGINATION_RESPONSE = 'Lead pagination response is invalid.';

const readObject = (value: unknown): Record<string, unknown> | null =>
  Array.isArray(value) ? null : readRecord(value);

const hasProperty = (
  value: Record<string, unknown>,
  property: string,
): boolean => Object.prototype.hasOwnProperty.call(value, property);

const readNullableStringField = (
  value: Record<string, unknown>,
  property: string,
): string | null => {
  if (!hasProperty(value, property)) {
    throw new Error(INVALID_LEAD_LOOKUP_RESPONSE);
  }

  const candidate = value[property];
  if (candidate === null) return null;
  if (typeof candidate !== 'string') {
    throw new Error(INVALID_LEAD_LOOKUP_RESPONSE);
  }

  return candidate.length > 0 ? candidate : null;
};

const readRequiredStringField = (
  value: Record<string, unknown>,
  property: string,
): string => {
  const candidate = readNullableStringField(value, property);
  if (!candidate) throw new Error(INVALID_LEAD_LOOKUP_RESPONSE);
  return candidate;
};

const readNullableLinkField = (
  value: Record<string, unknown>,
  property: string,
): string | null => {
  if (!hasProperty(value, property)) {
    throw new Error(INVALID_LEAD_LOOKUP_RESPONSE);
  }

  const link = value[property];
  if (link === null) return null;

  const linkRecord = readObject(link);
  if (!linkRecord || !hasProperty(linkRecord, 'primaryLinkUrl')) {
    throw new Error(INVALID_LEAD_LOOKUP_RESPONSE);
  }

  const primaryLinkUrl = linkRecord.primaryLinkUrl;
  if (primaryLinkUrl === null) return null;
  if (typeof primaryLinkUrl !== 'string') {
    throw new Error(INVALID_LEAD_LOOKUP_RESPONSE);
  }

  return primaryLinkUrl.length > 0 ? primaryLinkUrl : null;
};

const readLeadNodes = (value: unknown): Record<string, unknown>[] => {
  const leads = readObject(value);
  const edges = readProperty(leads, 'edges');

  if (!leads || !Array.isArray(edges)) {
    throw new Error(INVALID_LEAD_LOOKUP_RESPONSE);
  }

  return edges.map((edge) => {
    const edgeRecord = readObject(edge);
    const node = readObject(readProperty(edgeRecord, 'node'));

    if (!edgeRecord || !node) {
      throw new Error(INVALID_LEAD_LOOKUP_RESPONSE);
    }

    return node;
  });
};

const readLeadPage = (response: unknown): LeadPage => {
  const leads = readObject(readProperty(response, 'leads'));
  const pageInfo = readObject(readProperty(leads, 'pageInfo'));

  if (!leads || !pageInfo) {
    throw new Error(INVALID_LEAD_PAGINATION_RESPONSE);
  }

  const hasNextPage = readProperty(pageInfo, 'hasNextPage');
  const endCursor = readProperty(pageInfo, 'endCursor');

  if (
    typeof hasNextPage !== 'boolean' ||
    (typeof endCursor !== 'string' && endCursor !== null) ||
    (hasNextPage && (endCursor === null || endCursor.length === 0))
  ) {
    throw new Error(INVALID_LEAD_PAGINATION_RESPONSE);
  }

  return {
    nodes: readLeadNodes(leads),
    hasNextPage,
    endCursor,
  };
};

const uniqueStrings = (values: readonly (string | null | undefined)[]) => [
  ...new Set(
    values.filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    ),
  ),
];

const escapeIlikePattern = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

const buildTextPattern = (value: string | null | undefined): string => {
  const canonical = canonicalizeText(value);
  if (!canonical) return '%';

  return '%' + escapeIlikePattern(canonical).replace(/\s+/g, '%') + '%';
};

const decodeUrlComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const buildUrlLikeFilter = (
  field: 'websiteUrl' | 'directoryUrl',
  value: string | null | undefined,
  canonicalize: (value: string | null | undefined) => string,
): LeadFilter | null => {
  const canonical = canonicalize(value);
  const canonicalBase = canonical.split('?')[0];
  const canonicalHost = canonicalBase.split('/')[0] ?? canonicalBase;
  const canonicalPath = canonicalBase.slice(canonicalHost.length);
  const unicodeHost = domainToUnicode(canonicalHost);
  const decodedCanonicalPath = decodeUrlComponent(canonicalPath);
  const canonicalPathTail = canonicalPath.split('/').filter(Boolean).at(-1);
  const decodedCanonicalPathTail = decodedCanonicalPath
    .split('/')
    .filter(Boolean)
    .at(-1);
  const rawWithQuery = (value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .split('#')[0];
  const rawWithoutScheme = rawWithQuery.replace(
    /^[a-z][a-z\d+.-]*:\/\//i,
    '',
  );
  const rawWithoutWww = rawWithoutScheme.replace(/^www\./i, '');
  const lowercaseRawWithoutScheme = rawWithoutScheme.toLocaleLowerCase('en-US');
  const lowercaseRawWithoutWww = rawWithoutWww.toLocaleLowerCase('en-US');
  const removeTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');
  const bases = uniqueStrings([
    rawWithoutScheme,
    rawWithoutWww,
    lowercaseRawWithoutScheme,
    lowercaseRawWithoutWww,
    removeTrailingSlashes(rawWithoutScheme),
    removeTrailingSlashes(rawWithoutWww),
    removeTrailingSlashes(lowercaseRawWithoutScheme),
    removeTrailingSlashes(lowercaseRawWithoutWww),
    canonicalBase,
    removeTrailingSlashes(canonicalBase),
    unicodeHost + canonicalPath,
    canonicalHost + decodedCanonicalPath,
    unicodeHost + decodedCanonicalPath,
  ]);

  const queryFragments = canonical
    .split('?')[1]
    ?.split('&')
    .filter((fragment) => fragment.length > 0);
  const patterns = bases.map(
    (base) => '%' + escapeIlikePattern(base) + '%',
  );

  for (const host of uniqueStrings([canonicalHost, unicodeHost])) {
    for (const pathTail of uniqueStrings([
      canonicalPathTail,
      decodedCanonicalPathTail,
    ])) {
      patterns.push(
        `%${escapeIlikePattern(host)}%/${escapeIlikePattern(pathTail)}%`,
      );
    }
  }

  for (const fragment of queryFragments ?? []) {
    patterns.push(`%${escapeIlikePattern(fragment)}%`);
  }

  if (patterns.length === 0) return null;

  const filters = uniqueStrings(patterns).map((pattern) => ({
    [field]: {
      primaryLinkUrl: {
        ilike: pattern,
      },
    },
  }));

  return filters.length === 1 ? filters[0] : { or: filters };
};

const buildNameCityFilter = (row: LeadImportRow): LeadFilter => {
  const city = canonicalizeText(row.city);
  const filters: LeadFilter[] = [
    { name: { ilike: buildTextPattern(row.name) } },
  ];

  if (city) {
    filters.push({ city: { ilike: buildTextPattern(row.city) } });
  }

  return { and: filters };
};

const buildLeadCandidateFilter = (
  rows: readonly LeadImportRow[],
): LeadFilter => {
  const dedupeKeys = uniqueStrings(rows.map(buildLeadDedupeKey));
  const filters: LeadFilter[] = [];

  if (dedupeKeys.length > 0) {
    filters.push({ dedupeKey: { in: dedupeKeys } });
  }

  for (const row of rows) {
    const websiteFilter = buildUrlLikeFilter(
      'websiteUrl',
      row.websiteUrl,
      canonicalizeUrl,
    );
    const directoryFilter = buildUrlLikeFilter(
      'directoryUrl',
      row.directoryUrl,
      canonicalizeDirectoryUrl,
    );

    if (websiteFilter) filters.push(websiteFilter);
    if (directoryFilter) filters.push(directoryFilter);
    filters.push(buildNameCityFilter(row));
  }

  return filters.length === 1 ? filters[0] : { or: filters };
};

const buildLeadFilterBatches = (
  rows: readonly LeadImportRow[],
): LeadFilter[] => {
  const filters: LeadFilter[] = [];
  let currentRows: LeadImportRow[] = [];

  for (const row of rows) {
    const candidateRows = [...currentRows, row];
    const candidateFilter = buildLeadCandidateFilter(candidateRows);
    const exceedsRowLimit = candidateRows.length > LEAD_FILTER_BATCH_SIZE;
    const exceedsPayloadLimit =
      measureSerializedPayload(candidateFilter) > MAX_LEAD_FILTER_PAYLOAD_BYTES;

    if (currentRows.length > 0 && (exceedsRowLimit || exceedsPayloadLimit)) {
      filters.push(buildLeadCandidateFilter(currentRows));
      currentRows = [row];

      if (
        measureSerializedPayload(buildLeadCandidateFilter(currentRows)) >
        MAX_LEAD_FILTER_PAYLOAD_BYTES
      ) {
        throw new Error('Lead identity filter payload is too large.');
      }
      continue;
    }

    if (exceedsPayloadLimit) {
      throw new Error('Lead identity filter payload is too large.');
    }

    currentRows = candidateRows;
  }

  if (currentRows.length > 0) {
    filters.push(buildLeadCandidateFilter(currentRows));
  }

  return filters;
};

const readExistingLead = (
  lead: Record<string, unknown>,
): ExistingLead => {
  return {
    id: readRequiredStringField(lead, 'id'),
    dedupeKey: readNullableStringField(lead, 'dedupeKey'),
    name: readRequiredStringField(lead, 'name'),
    city: readNullableStringField(lead, 'city'),
    websiteUrl: readNullableLinkField(lead, 'websiteUrl'),
    directoryUrl: readNullableLinkField(lead, 'directoryUrl'),
  };
};

const collectExistingLeadCandidates = async (
  client: CoreApiClient,
  filter: LeadFilter,
  existingLeadsById: Map<string, ExistingLead>,
): Promise<void> => {
  const seenCursors = new Set<string>();
  let after: string | undefined;

  while (true) {
    const page = readLeadPage(
      await client.query({
        leads: {
          __args: {
            first: LEADS_PAGE_SIZE,
            filter,
            ...(after === undefined ? {} : { after }),
          },
          edges: {
            node: {
              id: true,
              dedupeKey: true,
              name: true,
              city: true,
              websiteUrl: { primaryLinkUrl: true },
              directoryUrl: { primaryLinkUrl: true },
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      }),
    );

    for (const lead of page.nodes) {
      const existingLead = readExistingLead(lead);
      existingLeadsById.set(existingLead.id, existingLead);
    }

    if (!page.hasNextPage) break;

    const nextCursor = page.endCursor;
    if (!nextCursor || nextCursor === after || seenCursors.has(nextCursor)) {
      throw new Error('Lead pagination cursor did not advance.');
    }

    seenCursors.add(nextCursor);
    after = nextCursor;
  }
};

export const findExistingLeadRecords = async (
  client: CoreApiClient,
  rows: readonly LeadImportRow[],
): Promise<Map<string, string>> => {
  if (rows.length === 0) return new Map();

  const existingLeadsById = new Map<string, ExistingLead>();
  for (const filter of buildLeadFilterBatches(rows)) {
    await collectExistingLeadCandidates(client, filter, existingLeadsById);
  }

  const existingLeads = [...existingLeadsById.values()];

  const byDedupeKey = new Map<string, string>();
  const byWebsite = new Map<string, string[]>();
  const byDirectory = new Map<string, string[]>();
  const byNameCity = new Map<string, string[]>();

  const addToIndex = (
    index: Map<string, string[]>,
    key: string,
    id: string,
  ) => {
    if (!key) return;
    const ids = index.get(key) ?? [];
    ids.push(id);
    index.set(key, ids);
  };

  for (const lead of existingLeads) {
    if (lead.dedupeKey) byDedupeKey.set(lead.dedupeKey, lead.id);
    addToIndex(byWebsite, canonicalizeUrl(lead.websiteUrl), lead.id);
    addToIndex(
      byDirectory,
      canonicalizeDirectoryUrl(lead.directoryUrl),
      lead.id,
    );
    addToIndex(
      byNameCity,
      `${canonicalizeText(lead.name)}:${canonicalizeText(lead.city)}`,
      lead.id,
    );
  }

  const assignedLeadIds = new Set<string>();
  const matches = new Map<string, string>();
  const takeFirstUnassigned = (ids: readonly string[] | undefined) =>
    ids?.find((id) => !assignedLeadIds.has(id)) ?? null;

  for (const row of rows) {
    const dedupeKey = buildLeadDedupeKey(row);
    const websiteKey = canonicalizeUrl(row.websiteUrl);
    const directoryKey = canonicalizeDirectoryUrl(row.directoryUrl);
    const nameCityKey = `${canonicalizeText(row.name)}:${canonicalizeText(row.city)}`;
    const dedupeLeadId = byDedupeKey.get(dedupeKey);
    const existingLeadId =
      takeFirstUnassigned(dedupeLeadId ? [dedupeLeadId] : undefined) ??
      takeFirstUnassigned(byWebsite.get(websiteKey)) ??
      takeFirstUnassigned(byDirectory.get(directoryKey)) ??
      takeFirstUnassigned(byNameCity.get(nameCityKey));

    if (existingLeadId) {
      assignedLeadIds.add(existingLeadId);
      matches.set(dedupeKey, existingLeadId);
    }
  }

  return matches;
};

export const buildLeadImportData = (
  row: LeadImportRow,
  dedupeKey?: string,
): Record<string, unknown> => {
  const linkValue = (value: string | null | undefined) =>
    value ? { primaryLinkUrl: value } : undefined;
  const richTextValue = (value: string | null | undefined) =>
    toRichTextValue(value);

  const data = {
    name: row.name,
    city: row.city,
    category: row.category,
    source: row.source ?? 'IMPORT',
    status: row.status ?? 'NEW',
    priority: row.priority ?? 'NORMAL',
    rating: row.rating,
    reviewCount: row.reviewCount,
    email: row.email,
    phone: row.phone,
    telegram: row.telegram,
    whatsapp: row.whatsapp,
    vk: row.vk,
    contactName: row.contactName,
    firstContactAt: row.firstContactAt,
    lastContactAt: row.lastContactAt,
    nextActionAt: row.nextActionAt,
    score: row.score,
    notes: richTextValue(row.notes),
    dedupeKey,
    websiteUrl: linkValue(row.websiteUrl),
    directoryUrl: linkValue(row.directoryUrl),
    sourceRowId: row.sourceRowId,
    sourceAddedAt: row.sourceAddedAt,
    hasWebsite: row.hasWebsite,
    sourceLabel: row.sourceLabel,
    outreachChannel: row.outreachChannel,
    firstMessageAt: row.firstMessageAt,
    firstMessage: richTextValue(row.firstMessage),
    followUpMessage2: richTextValue(row.followUpMessage2),
    followUpMessage2At: row.followUpMessage2At,
    followUpMessage3: richTextValue(row.followUpMessage3),
    followUpMessage3At: row.followUpMessage3At,
    replyChannel: row.replyChannel,
    replied: row.replied,
    sourceStatus: row.sourceStatus,
    refusalReason: row.refusalReason,
    agreed: row.agreed,
    workStartedAt: row.workStartedAt,
    projectPrice: row.projectPrice,
    installmentPayment: row.installmentPayment,
    installmentCount: row.installmentCount,
    prepayment: row.prepayment,
    totalPaid: row.totalPaid,
    remainingBalance: row.remainingBalance,
    percentPaid: row.percentPaid,
    nextAction: row.nextAction,
    region: row.region,
    reviewSignal: richTextValue(row.reviewSignal),
    qualificationScore: row.qualificationScore,
    sourcePriority: row.sourcePriority,
    fitReason: richTextValue(row.fitReason),
    websiteStatus: row.websiteStatus,
    websiteObservation: richTextValue(row.websiteObservation),
    proposedImprovement: richTextValue(row.proposedImprovement),
    primarySourceUrl: linkValue(row.primarySourceUrl),
    additionalSources: richTextValue(row.additionalSources),
    verifiedFacts: richTextValue(row.verifiedFacts),
    evidenceStrength: row.evidenceStrength,
    offerAngle: richTextValue(row.offerAngle),
    valueProposition: richTextValue(row.valueProposition),
    followUpAngle: richTextValue(row.followUpAngle),
    researchedAt: row.researchedAt,
    confidence: row.confidence,
    humanizerChecked: row.humanizerChecked,
    dashCheck: row.dashCheck,
    telegramUrl: linkValue(row.telegramUrl),
    telegramUsername: row.telegramUsername,
    telegramType: row.telegramType,
    telegramVerificationStatus: row.telegramVerificationStatus,
    telegramMessageable: row.telegramMessageable,
    telegramEvidenceUrl: linkValue(row.telegramEvidenceUrl),
    telegramVerificationNotes: richTextValue(row.telegramVerificationNotes),
    whatsappNumber: row.whatsappNumber,
    whatsappUrl: linkValue(row.whatsappUrl),
    whatsappVerificationStatus: row.whatsappVerificationStatus,
    whatsappMessageable: row.whatsappMessageable,
    whatsappEvidenceUrl: linkValue(row.whatsappEvidenceUrl),
    whatsappVerificationNotes: richTextValue(row.whatsappVerificationNotes),
    messengerContactStatus: row.messengerContactStatus,
    preferredMessenger: row.preferredMessenger,
    preferredOutreachChannel: row.preferredOutreachChannel,
    contactReadiness: row.contactReadiness,
    messengerVerificationDate: row.messengerVerificationDate,
    messengerVerificationConfidence: row.messengerVerificationConfidence,
  };

  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  );
};
