import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { describe, expect, it } from 'vitest';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from '../application.config';

type LogicExecution = {
  data: unknown;
  status: string;
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

    const execute = async (payload: Record<string, unknown>) => {
      const response = await metadataClient.mutation({
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
      expect(first.ok).toBe(true);
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
