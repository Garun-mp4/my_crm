import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  readEdges,
  readProperty,
  readString,
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

export const buildLeadImportData = (
  row: LeadImportRow,
  dedupeKey: string,
): Record<string, unknown> => ({
  name: row.name,
  city: row.city,
  category: row.category,
  source: 'IMPORT',
  rating: row.rating,
  reviewCount: row.reviewCount,
  email: row.email,
  phone: row.phone,
  notes: row.notes,
  dedupeKey,
  websiteUrl: row.websiteUrl ? { primaryLinkUrl: row.websiteUrl } : undefined,
  directoryUrl: row.directoryUrl
    ? { primaryLinkUrl: row.directoryUrl }
    : undefined,
});
