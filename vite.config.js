import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const pages = { main: resolve(import.meta.dirname, 'index.html') };
for (const n of [12, 15, 18, 21, 24]) pages[`w${n}`] = resolve(import.meta.dirname, `${n}/index.html`);

export default defineConfig({
  base: './',
  build: { rollupOptions: { input: pages }, target: 'es2022' },
  worker: { format: 'es' },
});
