import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dirname,
  resolve: {
    tsconfigPaths: true,
    alias: [
      {
        find: /^@\//,
        replacement: path.resolve(dirname, 'src/modules') + '/',
      },
      {
        find: /^~\//,
        replacement: path.resolve(dirname, 'src') + '/',
      },
    ],
  },
  test: {
    include: [
      'src/modules/navigation-menu-item/common/utils/__tests__/**/*.test.ts',
    ],
  },
});
