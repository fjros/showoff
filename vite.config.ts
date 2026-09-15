import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { resolve } from 'node:path';
import { pagesContent } from './scripts/pages-plugin.ts';

export default defineConfig(({ mode }) => {
  const settings = {
    ...loadEnv(mode, process.cwd(), 'SHOWOFF_'),
    ...process.env,
  };
  return {
    base: settings.SHOWOFF_BASE_PATH || '/',
    resolve: { alias: { '@': resolve(import.meta.dirname) } },
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [react(), pagesContent(settings)],
    build: { sourcemap: false },
  };
});
