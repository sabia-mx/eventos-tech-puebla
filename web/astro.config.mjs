import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(projectRoot, '..');

export default defineConfig({
  server: {
    port: 4321,
    host: '127.0.0.1',
  },
  vite: {
    server: {
      fs: {
        allow: [projectRoot, workspaceRoot],
      },
    },
  },
});
