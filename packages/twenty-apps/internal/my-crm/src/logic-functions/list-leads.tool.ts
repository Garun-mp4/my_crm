import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';
import { defineLogicFunction } from 'twenty-sdk/define';

import {
  buildAppClient,
  readBoolean,
  readEdges,
  readNumber,
  readProperty,
  readString,
} from '../modules/shared/integrations/core-api';
import {
  listLeadsSchema,
  type ListLeadsPayload,
} from '../modules/shared/logic/tool-schemas';
import {
  invalidInput,
  operationFailure,
  type ToolResult,
} from '../modules/shared/logic/tool-result';

const inputSchema = {
  type: 'object',
  properties: {
    query: { type: 'string', description: 'Part of the company name' },
    city: { type: 'string', description: 'Part of the city name' },
    status: {
      type: 'string',
      enum: [
        'NEW',
        'RESEARCHING',
        'RESEARCHED',
        'QUALIFIED',
        'DRAFT_READY',
        'CONTACTED',
        'REPLIED',
        'MEETING',
        'WON',
        'LOST',
        'DUPLICATE',
        'DO_NOT_CONTACT',
      ],
    },
    first: { type: 'integer', minimum: 1, maximum: 50 },
    after: {
      type: 'string',
      description: 'Opaque cursor from the previous page',
    },
  },
  additionalProperties: false,
} as const;

type LeadSummary = {
  id: string;
  name: string;
  city: string | null;
  status: string | null;
  researchStatus: string | null;
  websiteUrl: string | null;
  rating: number | null;
};

type ListLeadsResult = ToolResult<{
  leads: LeadSummary[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}>;

const handler = async (
  rawPayload: ListLeadsPayload,
  _context: LogicFunctionExecutionContext,
): Promise<ListLeadsResult> => {
  const parsed = listLeadsSchema.safeParse(rawPayload);
  if (!parsed.success) return invalidInput('Lead search input is invalid.');

  const input = parsed.data;
  const filter: Record<string, unknown> = {};

  if (input.query) filter.name = { ilike: `%${input.query}%` };
  if (input.city) filter.city = { ilike: `%${input.city}%` };
  if (input.status) filter.status = { eq: input.status };

  try {
    const client = buildAppClient();
    const response: unknown = await client.query({
      leads: {
        __args: {
          first: input.first,
          ...(input.after ? { after: input.after } : {}),
          ...(Object.keys(filter).length > 0 ? { filter } : {}),
        },
        edges: {
          node: {
            id: true,
            name: true,
            city: true,
            status: true,
            researchStatus: true,
            websiteUrl: { primaryLinkUrl: true },
            rating: true,
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });

    const leads = readEdges(readProperty(response, 'leads')).flatMap((lead) => {
      const id = readString(lead, 'id');
      const name = readString(lead, 'name');
      if (!id || !name) return [];

      return [
        {
          id,
          name,
          city: readString(lead, 'city'),
          status: readString(lead, 'status'),
          researchStatus: readString(lead, 'researchStatus'),
          websiteUrl: readString(
            readProperty(lead, 'websiteUrl'),
            'primaryLinkUrl',
          ),
          rating: readNumber(lead, 'rating'),
        },
      ];
    });

    const pageInfo = readProperty(readProperty(response, 'leads'), 'pageInfo');

    return {
      ok: true,
      leads,
      pageInfo: {
        hasNextPage: readBoolean(pageInfo, 'hasNextPage') ?? false,
        endCursor: readString(pageInfo, 'endCursor'),
      },
    };
  } catch (error) {
    return operationFailure(error);
  }
};

export default defineLogicFunction({
  universalIdentifier: 'f7281b93-c3a4-4511-9789-990011223355',
  name: 'crm_list_leads',
  description:
    'Search and page through CRM leads. This is a read-only bounded query and never contacts a lead.',
  timeoutSeconds: 15,
  handler,
  toolTriggerSettings: { inputSchema },
});
