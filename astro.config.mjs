import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://eventos-tech-puebla.vercel.app',
  server: {
    port: 4321,
    host: '127.0.0.1',
  },
});
