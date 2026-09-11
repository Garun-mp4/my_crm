import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const serverUrl = (process.env.TWENTY_SERVER_URL ?? 'http://server:3000').replace(
  /\/$/,
  '',
);
const origin = process.env.TWENTY_SYNC_ORIGIN ?? 'http://localhost:3001';
const email = process.env.TWENTY_SYNC_EMAIL ?? 'tim@apple.dev';
const password = process.env.TWENTY_SYNC_PASSWORD ?? 'tim@apple.dev';

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const postMetadata = async (query, variables) => {
  const response = await fetch(`${serverUrl}/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();

  if (!response.ok || payload.errors?.length || !payload.data) {
    const message = payload.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join('; ');

    throw new Error(message || `Metadata request failed with ${response.status}`);
  }

  return payload.data;
};

const waitForServer = async () => {
  for (let attempt = 1; attempt <= 90; attempt += 1) {
    try {
      const response = await fetch(`${serverUrl}/healthz`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // The server may still be starting or completing its first migration.
    }

    await sleep(2000);
  }

  throw new Error(`Twenty server did not become healthy at ${serverUrl}`);
};

const getAccessToken = async () => {
  const loginData = await postMetadata(
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

  const loginToken = loginData.getLoginTokenFromCredentials?.loginToken?.token;

  if (!loginToken) {
    throw new Error('Twenty login did not return a login token');
  }

  const authData = await postMetadata(
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

  const accessToken =
    authData.getAuthTokensFromLoginToken?.tokens?.accessOrWorkspaceAgnosticToken
      ?.token;

  if (!accessToken) {
    throw new Error('Twenty login did not return an access token');
  }

  return accessToken;
};

const waitForAccessToken = async () => {
  let lastError;

  for (let attempt = 1; attempt <= 45; attempt += 1) {
    try {
      return await getAccessToken();
    } catch (error) {
      lastError = error;
      await sleep(2000);
    }
  }

  throw lastError ?? new Error('Twenty authentication did not become available');
};

const writeRemoteConfig = async (accessToken) => {
  const configDirectory = path.join(os.homedir(), '.twenty');
  await mkdir(configDirectory, { recursive: true });
  await writeFile(
    path.join(configDirectory, 'config.json'),
    `${JSON.stringify(
      {
        version: 1,
        defaultRemote: 'crm-local',
        remotes: {
          'crm-local': {
            apiUrl: serverUrl,
            apiKey: accessToken,
          },
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
};

const runApply = () =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      [
        '/app/packages/twenty-sdk/dist/cli.cjs',
        'apply',
        'packages/twenty-apps/internal/my-crm',
        '--force',
        '--no-delete',
      ],
      {
        cwd: '/app',
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
        stdio: 'inherit',
      },
    );

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`My CRM sync was terminated by ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`My CRM sync exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });

await waitForServer();
const accessToken = await waitForAccessToken();
await writeRemoteConfig(accessToken);
await runApply();
console.log('My CRM metadata synchronization completed.');
