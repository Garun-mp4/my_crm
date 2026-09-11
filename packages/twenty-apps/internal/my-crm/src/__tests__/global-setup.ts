import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';

import type {
  appDevOnce as AppDevOnce,
  appUninstall as AppUninstall,
} from '../../../../../twenty-sdk/dist/cli/operations/index';

const require = createRequire(import.meta.url);
const { appDevOnce, appUninstall } =
  require('../../../../../twenty-sdk/dist/operations.cjs') as {
    appDevOnce: typeof AppDevOnce;
    appUninstall: typeof AppUninstall;
  };

const APP_PATH = process.cwd();
const CONFIG_DIR = path.join(os.homedir(), '.twenty');
const TEST_CONFIG_PATH = path.join(CONFIG_DIR, 'config.test.json');
let previousTestConfig: string | undefined;
let hadPreviousTestConfig = false;

const requireIntegrationEnv = (): { apiUrl: string; apiKey: string } => {
  const apiUrl = process.env.TWENTY_API_URL;
  const apiKey = process.env.TWENTY_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error(
      'TWENTY_API_URL and TWENTY_API_KEY must be set for CRM integration tests.',
    );
  }

  return { apiUrl, apiKey };
};

const checkServer = async (apiUrl: string): Promise<void> => {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}/healthz`);
  } catch {
    throw new Error(`Twenty server is not reachable at ${apiUrl}.`);
  }

  if (!response.ok) {
    throw new Error(`Twenty server at ${apiUrl} returned ${response.status}.`);
  }
};

const writeTestConfig = (apiUrl: string, apiKey: string): void => {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  hadPreviousTestConfig = fs.existsSync(TEST_CONFIG_PATH);
  previousTestConfig = hadPreviousTestConfig
    ? fs.readFileSync(TEST_CONFIG_PATH, 'utf8')
    : undefined;
  fs.writeFileSync(
    TEST_CONFIG_PATH,
    JSON.stringify(
      {
        remotes: {
          local: { apiUrl, apiKey, accessToken: apiKey },
        },
        defaultRemote: 'local',
      },
      null,
      2,
    ),
  );
};

const restoreTestConfig = (): void => {
  if (hadPreviousTestConfig && previousTestConfig !== undefined) {
    fs.writeFileSync(TEST_CONFIG_PATH, previousTestConfig);
  } else if (fs.existsSync(TEST_CONFIG_PATH)) {
    fs.rmSync(TEST_CONFIG_PATH);
  }
};

export async function setup(): Promise<void> {
  const { apiUrl, apiKey } = requireIntegrationEnv();
  await checkServer(apiUrl);
  writeTestConfig(apiUrl, apiKey);

  try {
    await appUninstall({ appPath: APP_PATH }).catch(() => undefined);
    const result = await appDevOnce({
      appPath: APP_PATH,
      onProgress: (message: string) => console.log(`[my-crm dev] ${message}`),
    });

    if (!result.success) {
      throw new Error(
        `My CRM app sync failed: ${result.error?.message ?? 'unknown error'}`,
      );
    }
  } catch (error) {
    restoreTestConfig();
    throw error;
  }
}

export async function teardown(): Promise<void> {
  const result = await appUninstall({ appPath: APP_PATH });

  if (!result.success) {
    console.warn(
      `My CRM app uninstall failed: ${result.error?.message ?? 'unknown error'}`,
    );
  }

  restoreTestConfig();
}
