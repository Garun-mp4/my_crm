import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  buildLeadDedupeKey,
  canonicalizeDirectoryUrl,
  canonicalizeText,
  canonicalizeUrl,
} from '../shared/domain/lead-dedupe';
import {
  readEdges,
  readProperty,
  readString,
  toRichTextValue,
} from '../shared/integrations/core-api';
import { type LeadImportRow } from './lead-csv-import';

export const findExistingLeadDedupeKeys = async (
  client: CoreApiClient,
  dedupeKeys: readonly string[],
): Promise<Set<string>> => {
  if (dedupeKeys.length === 0) return new Set();

  const response: unknown = await client.query({
    leads: {
      __args: {
        filter: { dedupeKey: { in: [...new Set(dedupeKeys)] } },
        first: Math.min(dedupeKeys.length, 500),
      },
      edges: { node: { dedupeKey: true } },
    },
  });

  return new Set(
    readEdges(readProperty(response, 'leads')).flatMap((lead) => {
      const key = readString(lead, 'dedupeKey');
      return key ? [key] : [];
    }),
  );
};

export const findExistingLeadRecords = async (
  client: CoreApiClient,
  rows: readonly LeadImportRow[],
): Promise<Map<string, string>> => {
  if (rows.length === 0) return new Map();

  const response: unknown = await client.query({
    leads: {
      __args: { first: 500 },
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
    },
  });

  const existingLeads = readEdges(readProperty(response, 'leads')).flatMap(
    (lead) => {
      const id = readString(lead, 'id');
      const name = readString(lead, 'name');
      if (!id || !name) return [];

      return [
        {
          id,
          dedupeKey: readString(lead, 'dedupeKey'),
          name,
          city: readString(lead, 'city'),
          websiteUrl: readString(
            readProperty(lead, 'websiteUrl'),
            'primaryLinkUrl',
          ),
          directoryUrl: readString(
            readProperty(lead, 'directoryUrl'),
            'primaryLinkUrl',
          ),
        },
      ];
    },
  );

  const byDedupeKey = new Map<string, string>();
  const byWebsite = new Map<string, string[]>();
  const byDirectory = new Map<string, string[]>();
  const byNameCity = new Map<string, string[]>();

  const addToIndex = (index: Map<string, string[]>, key: string, id: string) => {
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
    Object.entries(data).filter(([, value]) => value !== null && value !== undefined),
  );
};
