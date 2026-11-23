import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import seo from './build/seo.js';

// Absolute site URL, needed for canonical / OpenGraph tags. Override with SITE_URL for a custom domain.
const SITE_URL = process.env.SITE_URL || 'https://karpeleslab.github.io/alltheseeds/';

const pages = { main: resolve(import.meta.dirname, 'index.html') };
for (const n of [12, 15, 18, 21, 24]) pages[`w${n}`] = resolve(import.meta.dirname, `${n}/index.html`);

export default defineConfig({
  base: './',
  plugins: [seo({ site: SITE_URL })],
  build: { rollupOptions: { input: pages }, target: 'es2022' },
  worker: { format: 'es' },
});
