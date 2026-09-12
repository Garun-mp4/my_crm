import { readFile } from 'node:fs/promises';

const csvPath = process.env.LEAD_TRACKER_CSV_PATH ?? '/import/leads.csv';
const fileName =
  process.env.LEAD_TRACKER_FILE_NAME ?? 'lead_tracker_websites_messenger_verified.xlsx';
const idempotencyKey =
  process.env.LEAD_TRACKER_IDEMPOTENCY_KEY ?? 'lead-tracker-full-sync-v1';
const configPath =
  process.env.TWENTY_CONFIG_PATH ?? '/root/.twenty/config.json';

const config = JSON.parse(await readFile(configPath, 'utf8'));
const remoteName = config.defaultRemote;
const remote = config.remotes?.[remoteName];
if (!remote?.apiUrl || !remote.apiKey) {
  throw new Error('Twenty remote configuration is missing for lead synchronization');
}

const csv = await readFile(csvPath, 'utf8');

const request = async (query, variables) => {
  const response = await fetch(`${remote.apiUrl.replace(/\/$/, '')}/metadata`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${remote.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length || !payload.data) {
    const message = payload.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join('; ');
    throw new Error(message || `Twenty metadata request failed with ${response.status}`);
  }
  return payload.data;
};

const functions = await request(`
  query FindManyLogicFunctions {
    findManyLogicFunctions {
      id
      name
    }
  }
`);
const target = functions.findManyLogicFunctions?.find(
  (logicFunction) => logicFunction.name === 'crm_sync_lead_tracker',
);
if (!target?.id) throw new Error('crm_sync_lead_tracker is not installed');

const result = await request(
  `
    mutation ExecuteOneLogicFunction($input: ExecuteOneLogicFunctionInput!) {
      executeOneLogicFunction(input: $input) {
        data
        duration
        status
        error
      }
    }
  `,
  {
    input: {
      id: target.id,
      payload: { csv, fileName, idempotencyKey, confirm: true },
    },
  },
);

const execution = result.executeOneLogicFunction;
if (execution?.status !== 'SUCCESS') {
  throw new Error(
    execution?.error?.errorMessage ?? 'Lead tracker synchronization failed',
  );
}

console.log(
  JSON.stringify({
    status: execution.status,
    duration: execution.duration,
    result: execution.data,
  }),
);
