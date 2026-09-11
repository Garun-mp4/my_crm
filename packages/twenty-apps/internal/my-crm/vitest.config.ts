import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.integration-test.ts'],
          testTimeout: 120_000,
          hookTimeout: 120_000,
          fileParallelism: false,
          globalSetup: ['src/__tests__/global-setup.ts'],
          env: {
            TWENTY_API_URL: process.env.TWENTY_API_URL ?? '',
            TWENTY_API_KEY: process.env.TWENTY_API_KEY ?? '',
          },
        },
      },
    ],
  },
});
