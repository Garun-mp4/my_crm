import { type CoreApiClient } from 'twenty-client-sdk/core';
import { describe, expect, it, vi } from 'vitest';

import { type LeadImportRow } from './lead-csv-import';
import {
  findExistingLeadDedupeKeys,
  findExistingLeadRecords,
  MAX_LEAD_FILTER_PAYLOAD_BYTES,
} from './lead-import-core';

type GraphQLFilter = {
  and?: GraphQLFilter[];
  or?: GraphQLFilter[];
  dedupeKey?: { in: string[] };
  websiteUrl?: { primaryLinkUrl: { ilike: string } };
  directoryUrl?: { primaryLinkUrl: { ilike: string } };
  name?: { ilike: string };
  city?: { ilike: string };
};

type LeadQueryArgs = {
  after?: string;
  first?: number;
  filter?: GraphQLFilter;
};

type LeadNodeSelection = {
  id?: true;
  dedupeKey?: true;
  name?: true;
  city?: true;
  websiteUrl?: { primaryLinkUrl: true };
  directoryUrl?: { primaryLinkUrl: true };
};

type FieldSelection = {
  node?: LeadNodeSelection;
};

type LeadsSelection = {
  __args?: LeadQueryArgs;
  edges?: FieldSelection;
  pageInfo?: { hasNextPage: true; endCursor: true };
};

type GraphQLSelection = {
  leads?: LeadsSelection;
};

const createClient = (
  query: (selection: GraphQLSelection) => Promise<unknown>,
): CoreApiClient => ({ query }) as unknown as CoreApiClient;

const getLeadsSelection = (selection: GraphQLSelection): LeadsSelection => {
  if (!selection.leads) throw new Error('Leads selection is missing.');
  return selection.leads;
};

const getAfter = (selection: GraphQLSelection): string | undefined =>
  getLeadsSelection(selection).__args?.after;

const getFilter = (selection: GraphQLSelection): GraphQLFilter => {
  const filter = getLeadsSelection(selection).__args?.filter;
  if (!filter) throw new Error('Lead filter is missing.');
  return filter;
};

const getDedupeKeys = (selection: GraphQLSelection): string[] =>
  getFilter(selection).dedupeKey?.in ?? [];

const buildPage = (
  nodes: Record<string, unknown>[],
  pageInfo: { hasNextPage: boolean; endCursor: string | null },
) => ({
  leads: {
    edges: nodes.map((node) => ({ node })),
    pageInfo,
  },
});

const buildLead = ({
  id,
  name,
  city,
  dedupeKey,
  website,
  directory,
}: {
  id: string;
  name: string;
  city: string | null;
  dedupeKey: string | null;
  website: string | null;
  directory: string | null;
}) => ({
  id,
  dedupeKey,
  name,
  city,
  websiteUrl: website ? { primaryLinkUrl: website } : null,
  directoryUrl: directory ? { primaryLinkUrl: directory } : null,
});

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchesIlike = (value: string | null, pattern: string): boolean => {
  if (value === null) return false;

  let expression = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '\\' && index + 1 < pattern.length) {
      index += 1;
      expression += escapeRegex(pattern[index] ?? '');
    } else if (character === '%') {
      expression += '.*';
    } else if (character === '_') {
      expression += '.';
    } else {
      expression += escapeRegex(character ?? '');
    }
  }

  return new RegExp(`${expression}$`, 'iu').test(value);
};

const readLeadTextValue = (
  lead: Record<string, unknown>,
  field: 'dedupeKey' | 'name' | 'city',
): string | null => {
  const value = lead[field];
  return typeof value === 'string' ? value : null;
};

const readLeadUrlValue = (
  lead: Record<string, unknown>,
  field: 'websiteUrl' | 'directoryUrl',
): string | null => {
  const link = lead[field];
  if (typeof link !== 'object' || link === null || Array.isArray(link)) {
    return null;
  }

  const primaryLinkUrl = (link as { primaryLinkUrl?: unknown }).primaryLinkUrl;
  return typeof primaryLinkUrl === 'string' ? primaryLinkUrl : null;
};

const matchesGraphQLFilter = (
  filter: GraphQLFilter,
  lead: Record<string, unknown>,
): boolean => {
  if (filter.and && !filter.and.every((item) => matchesGraphQLFilter(item, lead))) {
    return false;
  }
  if (filter.or && !filter.or.some((item) => matchesGraphQLFilter(item, lead))) {
    return false;
  }

  if (
    filter.dedupeKey &&
    !filter.dedupeKey.in.includes(readLeadTextValue(lead, 'dedupeKey') ?? '')
  ) {
    return false;
  }

  const websitePattern = filter.websiteUrl?.primaryLinkUrl.ilike;
  if (websitePattern && !matchesIlike(readLeadUrlValue(lead, 'websiteUrl'), websitePattern)) {
    return false;
  }

  const directoryPattern = filter.directoryUrl?.primaryLinkUrl.ilike;
  if (
    directoryPattern &&
    !matchesIlike(readLeadUrlValue(lead, 'directoryUrl'), directoryPattern)
  ) {
    return false;
  }

  const namePattern = filter.name?.ilike;
  if (namePattern && !matchesIlike(readLeadTextValue(lead, 'name'), namePattern)) {
    return false;
  }

  const cityPattern = filter.city?.ilike;
  if (cityPattern && !matchesIlike(readLeadTextValue(lead, 'city'), cityPattern)) {
    return false;
  }

  return true;
};

const createFilterAwareQuery = (existing: Record<string, unknown>) =>
  vi.fn((selection: GraphQLSelection): Promise<unknown> => {
    const filter = getFilter(selection);
    return Promise.resolve(
      buildPage(
        matchesGraphQLFilter(filter, existing) ? [existing] : [],
        { hasNextPage: false, endCursor: null },
      ),
    );
  });

const buildImportRow = (
  overrides: Partial<LeadImportRow> = {},
): LeadImportRow => ({
  name: 'Imported lead',
  city: 'Moscow',
  websiteUrl: 'https://imported.example',
  directoryUrl: null,
  ...overrides,
});

describe('lead import core lookups', () => {
  it('matches existing records from every cursor page', async () => {
    const query = vi.fn((selection: GraphQLSelection): Promise<unknown> => {
      const after = getAfter(selection);
      return Promise.resolve(
        buildPage(
          [
            buildLead(
              after
                ? {
                    id: 'lead-second-page',
                    name: 'Second page lead',
                    city: 'Moscow',
                    dedupeKey: 'website:second-page.example',
                    website: 'https://second-page.example',
                    directory: null,
                  }
                : {
                    id: 'lead-first-page',
                    name: 'First page lead',
                    city: 'Moscow',
                    dedupeKey: 'website:first-page.example',
                    website: 'https://first-page.example',
                    directory: null,
                  },
            ),
          ],
          after
            ? { hasNextPage: false, endCursor: null }
            : { hasNextPage: true, endCursor: 'cursor-1' },
        ),
      );
    });

    const matches = await findExistingLeadRecords(createClient(query), [
      buildImportRow({
        name: 'Second page lead',
        websiteUrl: 'https://second-page.example',
      }),
    ]);

    expect(matches).toEqual(
      new Map([['website:second-page.example', 'lead-second-page']]),
    );
    expect(query).toHaveBeenCalledTimes(2);

    const firstSelection = query.mock.calls[0]?.[0] as GraphQLSelection;
    expect(getLeadsSelection(firstSelection).__args?.first).toBe(500);
    expect(getLeadsSelection(firstSelection).pageInfo).toEqual({
      hasNextPage: true,
      endCursor: true,
    });
    expect(getLeadsSelection(firstSelection).edges).toEqual({
      node: {
        id: true,
        dedupeKey: true,
        name: true,
        city: true,
        websiteUrl: { primaryLinkUrl: true },
        directoryUrl: { primaryLinkUrl: true },
      },
    });
    expect(getFilter(firstSelection).or?.length).toBeGreaterThan(0);
    expect(getAfter(query.mock.calls[1]?.[0] as GraphQLSelection)).toBe(
      'cursor-1',
    );
  });

  it.each([
    {
      label: 'whitespace in text identity',
      row: buildImportRow({
        name: '  Acme   Group ',
        city: ' Moscow ',
        websiteUrl: null,
        directoryUrl: null,
      }),
      existing: buildLead({
        id: 'lead-whitespace',
        name: 'Acme Group',
        city: '  Moscow  ',
        dedupeKey: null,
        website: null,
        directory: null,
      }),
      expectedKey: 'name-city:acme group:moscow',
    },
    {
      label: 'slash before a directory query',
      row: buildImportRow({
        name: 'Yandex lead',
        websiteUrl: null,
        directoryUrl: 'https://yandex.ru/maps?oid=1',
      }),
      existing: buildLead({
        id: 'lead-directory-slash',
        name: 'Different directory lead',
        city: 'Other city',
        dedupeKey: null,
        website: null,
        directory: 'https://yandex.ru/maps/?oid=1',
      }),
      expectedKey: 'directory:yandex.ru/maps?oid=1',
    },
    {
      label: 'directory query parameter order',
      row: buildImportRow({
        name: 'Ordered directory lead',
        websiteUrl: null,
        directoryUrl: 'https://yandex.ru/maps?oid=2&ol=biz',
      }),
      existing: buildLead({
        id: 'lead-directory-order',
        name: 'Different ordered directory lead',
        city: 'Other city',
        dedupeKey: null,
        website: null,
        directory: 'https://yandex.ru/maps/?ol=biz&oid=2',
      }),
      expectedKey: 'directory:yandex.ru/maps?oid=2&ol=biz',
    },
    {
      label: 'directory query encoding',
      row: buildImportRow({
        name: 'Encoded directory lead',
        websiteUrl: null,
        directoryUrl: 'https://yandex.ru/maps?oid=3&name=Acme%20Co',
      }),
      existing: buildLead({
        id: 'lead-directory-encoding',
        name: 'Different encoded directory lead',
        city: 'Other city',
        dedupeKey: null,
        website: null,
        directory: 'https://yandex.ru/maps/?name=Acme+Co&oid=3',
      }),
      expectedKey: 'directory:yandex.ru/maps?name=acme+co&oid=3',
    },
  ])(
    'matches canonical identity variants: $label',
    async ({ row, existing, expectedKey }) => {
      const query = createFilterAwareQuery(existing);

      const matches = await findExistingLeadRecords(createClient(query), [row]);

      expect(matches).toEqual(new Map([[expectedKey, existing.id]]));
    },
  );

  it.each([
    {
      label: 'IDN hostname',
      rowWebsite:
        'https://xn--e1afmkfd.xn--p1ai/%D0%BC%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD',
      existingWebsite: 'https://пример.рф/магазин',
      expectedKey:
        'website:xn--e1afmkfd.xn--p1ai/%D0%BC%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD',
    },
    {
      label: 'Unicode path',
      rowWebsite:
        'https://example.com/%D0%BC%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD',
      existingWebsite: 'https://example.com/магазин',
      expectedKey: 'website:example.com/%D0%BC%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD',
    },
    {
      label: 'dot-segment path',
      rowWebsite: 'https://example.com/b',
      existingWebsite: 'https://example.com/a/../b',
      expectedKey: 'website:example.com/b',
    },
  ])(
    'uses a filter superset for non-ASCII and URL-normalized forms: $label',
    async ({ rowWebsite, existingWebsite, expectedKey }) => {
      const row = buildImportRow({
        name: 'Requested URL variant',
        city: 'Requested city',
        websiteUrl: rowWebsite,
      });
      const existing = buildLead({
        id: `lead-${rowWebsite}`,
        name: 'Different stored lead',
        city: 'Stored city',
        dedupeKey: null,
        website: existingWebsite,
        directory: null,
      });
      const query = createFilterAwareQuery(existing);

      const matches = await findExistingLeadRecords(createClient(query), [row]);

      expect(matches).toEqual(new Map([[expectedKey, existing.id]]));
    },
  );

  it.each([
    {
      label: 'website substring',
      row: buildImportRow({
        name: 'Requested lead',
        websiteUrl: 'https://example.com/acme',
      }),
      existing: buildLead({
        id: 'lead-false-website',
        name: 'Different lead',
        city: 'Other city',
        dedupeKey: 'website:notexample.com/acme',
        website: 'https://notexample.com/acme',
        directory: null,
      }),
    },
    {
      label: 'directory query value',
      row: buildImportRow({
        name: 'Requested directory lead',
        websiteUrl: null,
        directoryUrl: 'https://yandex.ru/maps?oid=1',
      }),
      existing: buildLead({
        id: 'lead-false-directory',
        name: 'Different directory lead',
        city: 'Other city',
        dedupeKey: 'directory:yandex.ru/maps?oid=2',
        website: null,
        directory: 'https://yandex.ru/maps/?oid=2',
      }),
    },
  ])(
    'does not accept a broad prefilter false positive: $label',
    async ({ row, existing }) => {
      const query = createFilterAwareQuery(existing);

      const matches = await findExistingLeadRecords(createClient(query), [row]);

      expect(matches).toEqual(new Map());
    },
  );

  it.each([500, 5_000])(
    'uses bounded identity filters for %s import rows',
    async (rowCount) => {
      const query = vi.fn(
        (_selection: GraphQLSelection): Promise<unknown> =>
          Promise.resolve(
            buildPage([], { hasNextPage: false, endCursor: null }),
          ),
      );

      await findExistingLeadRecords(
        createClient(query),
        Array.from({ length: rowCount }, (_, index) =>
          buildImportRow({
            name: `Lead ${index}`,
            websiteUrl: `https://lead-${index}.example`,
          }),
        ),
      );

      expect(query).toHaveBeenCalledTimes(rowCount / 50);
      expect(
        query.mock.calls.every(([selection]) => {
          const filter = getFilter(selection as GraphQLSelection);
          return (
            (filter.or?.length ?? 0) > 0 &&
            (filter.or?.length ?? 0) <= 101 &&
            new TextEncoder().encode(JSON.stringify(filter)).byteLength <=
              MAX_LEAD_FILTER_PAYLOAD_BYTES
          );
        }),
      ).toBe(true);
    },
    30_000,
  );

  it('keeps long two-URL batches below the serialized filter limit', async () => {
    const query = vi.fn(
      (_selection: GraphQLSelection): Promise<unknown> =>
        Promise.resolve(buildPage([], { hasNextPage: false, endCursor: null })),
    );
    const rows = Array.from({ length: 100 }, (_, index) =>
      buildImportRow({
        name: `Long lead ${index}`,
        websiteUrl: `https://example.com/${'a'.repeat(1_800)}-${index}`,
        directoryUrl: `https://yandex.ru/maps/${'b'.repeat(1_800)}?oid=${index}`,
      }),
    );

    await findExistingLeadRecords(createClient(query), rows);

    expect(query.mock.calls.length).toBeGreaterThan(2);
    expect(
      query.mock.calls.every(([selection]) => {
        const filter = getFilter(selection as GraphQLSelection);
        return (
          new TextEncoder().encode(JSON.stringify(filter)).byteLength <=
          MAX_LEAD_FILTER_PAYLOAD_BYTES
        );
      }),
    ).toBe(true);
  });

  it('collects more than one API page of matching candidates', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) =>
      buildLead({
        id: `candidate-${index}`,
        name: `Candidate ${index}`,
        city: 'Moscow',
        dedupeKey: `website:candidate-${index}.example`,
        website: `https://candidate-${index}.example`,
        directory: null,
      }),
    );
    const target = buildLead({
      id: 'target-after-500',
      name: 'Target after 500 candidates',
      city: 'Moscow',
      dedupeKey: 'website:target.example',
      website: 'https://target.example',
      directory: null,
    });
    const query = vi.fn(
      (selection: GraphQLSelection): Promise<unknown> =>
        Promise.resolve(
          buildPage(
            getAfter(selection) ? [target] : firstPage,
            getAfter(selection)
              ? { hasNextPage: false, endCursor: null }
              : { hasNextPage: true, endCursor: 'after-500' },
          ),
        ),
    );

    const matches = await findExistingLeadRecords(createClient(query), [
      buildImportRow({
        name: target.name,
        websiteUrl: 'https://target.example',
      }),
    ]);

    expect(matches).toEqual(
      new Map([['website:target.example', 'target-after-500']]),
    );
    expect(query).toHaveBeenCalledTimes(2);
    expect(getAfter(query.mock.calls[1]?.[0] as GraphQLSelection)).toBe(
      'after-500',
    );
  });

  it('rejects a page that does not advance its cursor', async () => {
    const query = vi.fn(
      (selection: GraphQLSelection): Promise<unknown> =>
        Promise.resolve(
          buildPage([], {
            hasNextPage: true,
            endCursor: getAfter(selection) ?? 'cursor-1',
          }),
        ),
    );

    await expect(
      findExistingLeadRecords(createClient(query), [buildImportRow()]),
    ).rejects.toThrow('Lead pagination cursor did not advance.');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      label: 'missing pageInfo',
      response: { leads: { edges: [] } },
    },
    {
      label: 'missing hasNextPage',
      response: { leads: { edges: [], pageInfo: { endCursor: null } } },
    },
    {
      label: 'missing endCursor',
      response: { leads: { edges: [], pageInfo: { hasNextPage: false } } },
    },
    {
      label: 'null endCursor on a continuing page',
      response: {
        leads: {
          edges: [],
          pageInfo: { hasNextPage: true, endCursor: null },
        },
      },
    },
  ])('fails closed for malformed pagination: $label', async ({ response }) => {
    const query = vi.fn(() => Promise.resolve(response));

    await expect(
      findExistingLeadRecords(createClient(query), [buildImportRow()]),
    ).rejects.toThrow('Lead pagination response is invalid.');
  });

  it.each([
    {
      label: 'missing edges',
      response: {
        leads: { pageInfo: { hasNextPage: false, endCursor: null } },
      },
    },
    {
      label: 'null edge',
      response: {
        leads: {
          edges: [null],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    },
    {
      label: 'edge without a node',
      response: {
        leads: {
          edges: [{}],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    },
  ])('fails closed for malformed lead edges: $label', async ({ response }) => {
    const query = vi.fn(() => Promise.resolve(response));

    await expect(
      findExistingLeadRecords(createClient(query), [buildImportRow()]),
    ).rejects.toThrow('Lead lookup response is invalid.');
  });

  it.each([
    {
      label: 'missing id',
      node: {
        dedupeKey: null,
        name: 'Lead',
        city: null,
        websiteUrl: null,
        directoryUrl: null,
      },
    },
    {
      label: 'wrong name scalar type',
      node: {
        id: 'lead-1',
        dedupeKey: null,
        name: 42,
        city: null,
        websiteUrl: null,
        directoryUrl: null,
      },
    },
    {
      label: 'wrong nullable scalar type',
      node: {
        id: 'lead-1',
        dedupeKey: 42,
        name: 'Lead',
        city: null,
        websiteUrl: null,
        directoryUrl: null,
      },
    },
    {
      label: 'wrong link scalar type',
      node: {
        id: 'lead-1',
        dedupeKey: null,
        name: 'Lead',
        city: null,
        websiteUrl: { primaryLinkUrl: 42 },
        directoryUrl: null,
      },
    },
  ])('fails closed for malformed lead fields: $label', async ({ node }) => {
    const query = vi.fn(() =>
      Promise.resolve(buildPage([node], { hasNextPage: false, endCursor: null })),
    );

    await expect(
      findExistingLeadRecords(createClient(query), [buildImportRow()]),
    ).rejects.toThrow('Lead lookup response is invalid.');
  });

  it.each([
    { label: 'missing dedupe key', node: {} },
    { label: 'wrong dedupe key scalar type', node: { dedupeKey: 42 } },
  ])('fails closed for malformed dedupe-key fields: $label', async ({ node }) => {
    const query = vi.fn(() =>
      Promise.resolve({
        leads: {
          edges: [{ node }],
        },
      }),
    );

    await expect(
      findExistingLeadDedupeKeys(createClient(query), ['website:lead.example']),
    ).rejects.toThrow('Lead lookup response is invalid.');
  });

  it('chunks dedupe-key filters larger than one API page', async () => {
    const dedupeKeys = Array.from(
      { length: 1001 },
      (_, index) => `website:lead-${index}.example`,
    );
    const query = vi.fn(
      (selection: GraphQLSelection): Promise<unknown> =>
        Promise.resolve({
          leads: {
            edges: getDedupeKeys(selection).map((dedupeKey) => ({
              node: { dedupeKey },
            })),
          },
        }),
    );

    const existingKeys = await findExistingLeadDedupeKeys(
      createClient(query),
      dedupeKeys,
    );

    expect(query).toHaveBeenCalledTimes(3);
    expect(
      query.mock.calls.map(
        ([selection]) =>
          getLeadsSelection(selection as GraphQLSelection).__args?.first,
      ),
    ).toEqual([500, 500, 1]);
    expect(
      query.mock.calls.map(([selection]) =>
        getDedupeKeys(selection as GraphQLSelection),
      ),
    ).toEqual([
      dedupeKeys.slice(0, 500),
      dedupeKeys.slice(500, 1000),
      dedupeKeys.slice(1000),
    ]);
    expect(existingKeys).toEqual(new Set(dedupeKeys));
  });

  it('keeps long dedupe-key filters below the serialized payload limit', async () => {
    const dedupeKeys = Array.from(
      { length: 100 },
      (_, index) => `website:${'a'.repeat(1_800)}-${index}`,
    );
    const query = vi.fn(
      (selection: GraphQLSelection): Promise<unknown> =>
        Promise.resolve({
          leads: {
            edges: getDedupeKeys(selection).map((dedupeKey) => ({
              node: { dedupeKey },
            })),
          },
        }),
    );

    const existingKeys = await findExistingLeadDedupeKeys(
      createClient(query),
      dedupeKeys,
    );

    expect(query.mock.calls.length).toBeGreaterThan(1);
    expect(
      query.mock.calls.every(([selection]) => {
        const filter = getFilter(selection as GraphQLSelection);
        return (
          new TextEncoder().encode(JSON.stringify(filter)).byteLength <=
          MAX_LEAD_FILTER_PAYLOAD_BYTES
        );
      }),
    ).toBe(true);
    expect(existingKeys).toEqual(new Set(dedupeKeys));
  });
});
