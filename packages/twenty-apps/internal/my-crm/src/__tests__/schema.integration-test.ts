import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { describe, expect, it } from 'vitest';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from '../application.config';

type LogicExecution = {
  data: unknown;
  status: string;
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type McpToolsResponse = {
  result?: { tools?: Array<{ name?: string }> };
  error?: { message?: string };
};

const postMetadataQuery = async <T>(
  query: string,
  variables: Record<string, string>,
): Promise<T> => {
  const apiUrl = process.env.TWENTY_API_URL;

  if (!apiUrl) {
    throw new Error('TWENTY_API_URL is required for integration tests.');
  }

  const response = await fetch(`${apiUrl}/metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const payload = (await response.json()) as GraphqlResponse<T>;

  if (!response.ok || payload.errors?.length || !payload.data) {
    const message = payload.errors
      ?.map((error) => error.message)
      .filter((error): error is string => Boolean(error))
      .join('; ');

    throw new Error(
      message ?? `Metadata request failed with ${response.status}.`,
    );
  }

  return payload.data;
};

const getUserAccessToken = async (): Promise<string> => {
  const apiUrl = process.env.TWENTY_API_URL;
  const origin = new URL(apiUrl ?? 'http://localhost:3000').toString();
  const email = process.env.TWENTY_INTEGRATION_USER_EMAIL ?? 'tim@apple.dev';
  const password =
    process.env.TWENTY_INTEGRATION_USER_PASSWORD ?? 'tim@apple.dev';

  const loginData = await postMetadataQuery<{
    getLoginTokenFromCredentials: { loginToken: { token: string } };
  }>(
    `
      mutation GetLoginTokenFromCredentials(
        $email: String!
        $password: String!
        $origin: String!
      ) {
        getLoginTokenFromCredentials(
          email: $email
          password: $password
          origin: $origin
        ) {
          loginToken { token }
        }
      }
    `,
    { email, password, origin },
  );

  const loginToken = loginData.getLoginTokenFromCredentials.loginToken.token;
  const authData = await postMetadataQuery<{
    getAuthTokensFromLoginToken: {
      tokens: { accessOrWorkspaceAgnosticToken: { token: string } };
    };
  }>(
    `
      mutation GetAuthTokensFromLoginToken(
        $loginToken: String!
        $origin: String!
      ) {
        getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) {
          tokens { accessOrWorkspaceAgnosticToken { token } }
        }
      }
    `,
    { loginToken, origin },
  );

  return authData.getAuthTokensFromLoginToken.tokens
    .accessOrWorkspaceAgnosticToken.token;
};

const readExecutionData = (
  execution: LogicExecution,
): Record<string, unknown> => {
  if (typeof execution.data === 'string') {
    return JSON.parse(execution.data) as Record<string, unknown>;
  }

  return execution.data as Record<string, unknown>;
};

describe('My CRM app installation', () => {
  it('installs the app and exposes the lead object', async () => {
    const metadataClient = new MetadataApiClient();
    const applications = await metadataClient.query({
      findManyApplications: {
        id: true,
        universalIdentifier: true,
      },
    });

    expect(
      applications.findManyApplications.find(
        (application: { universalIdentifier: string }) =>
          application.universalIdentifier === APPLICATION_UNIVERSAL_IDENTIFIER,
      ),
    ).toBeDefined();

    const logicFunctions = await metadataClient.query({
      findManyLogicFunctions: {
        id: true,
        name: true,
      },
    });
    const createLeadFunction = logicFunctions.findManyLogicFunctions.find(
      (logicFunction: { name: string }) =>
        logicFunction.name === 'crm_create_lead',
    );
    expect(createLeadFunction).toBeDefined();
    if (!createLeadFunction)
      throw new Error('crm_create_lead is not installed');
    const createLeadFunctionId = createLeadFunction.id;

    const userMetadataClient = new MetadataApiClient({
      headers: {
        Authorization: `Bearer ${await getUserAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    const execute = async (payload: Record<string, unknown>) => {
      const response = await userMetadataClient.mutation({
        executeOneLogicFunction: {
          __args: {
            input: { id: createLeadFunctionId, payload },
          },
          data: true,
          status: true,
        },
      });

      return response.executeOneLogicFunction as LogicExecution;
    };

    const client = new CoreApiClient();
    const idempotencyKey = `integration-${Date.now()}`;
    const leadName = `My CRM integration ${Date.now()}`;
    let leadId: string | undefined;

    try {
      const firstExecution = await execute({
        name: leadName,
        source: 'MANUAL',
        idempotencyKey,
      });
      const first = readExecutionData(firstExecution);
      expect(first.ok, JSON.stringify(first)).toBe(true);
      leadId = typeof first.leadId === 'string' ? first.leadId : undefined;
      expect(leadId).toBeDefined();

      const retry = readExecutionData(
        await execute({
          name: leadName,
          source: 'MANUAL',
          idempotencyKey,
        }),
      );
      expect(retry.ok).toBe(true);
      expect(retry.duplicate).toBe(true);

      const conflict = readExecutionData(
        await execute({
          name: 'A different payload',
          source: 'MANUAL',
          idempotencyKey,
        }),
      );
      expect(conflict).toMatchObject({
        ok: false,
        code: 'IDEMPOTENCY_CONFLICT',
      });

      const activities = await client.query({
        crmActivities: {
          __args: { filter: { leadId: { eq: leadId } }, first: 10 },
          edges: { node: { id: true, actorRole: true } },
        },
      });
      expect(activities.crmActivities.edges.length).toBeGreaterThan(0);

      const apiUrl = process.env.TWENTY_API_URL;
      const apiKey = process.env.TWENTY_API_KEY;
      if (!apiUrl || !apiKey)
        throw new Error('Integration API configuration is missing.');

      const mcpResponse = await fetch(`${apiUrl}/mcp`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-crm-tools-list',
          method: 'tools/list',
          params: {},
        }),
      });
      const mcpPayload = (await mcpResponse.json()) as McpToolsResponse;
      expect(mcpResponse.ok, JSON.stringify(mcpPayload)).toBe(true);
      expect(mcpPayload.error).toBeUndefined();
      expect(
        mcpPayload.result?.tools?.map((tool) => tool.name)?.sort(),
      ).toEqual(
        [
          'crm_list_leads',
          'crm_create_lead',
          'crm_transition_lead',
          'crm_start_research',
          'crm_run_research_job',
          'crm_retry_research_job',
          'crm_get_research_job',
          'crm_preview_lead_import',
          'crm_import_leads',
          'crm_rollback_import',
          'crm_record_research',
          'crm_create_outreach_draft',
          'crm_approve_outreach_draft',
          'crm_log_activity',
        ].sort(),
      );
    } finally {
      if (leadId) {
        await client.mutation({
          deleteLead: {
            __args: { id: leadId },
            id: true,
          },
        });
      }
    }
  });
});
