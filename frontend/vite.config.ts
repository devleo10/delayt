import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedEntry = path.resolve(__dirname, '../packages/shared/src/index.ts');

export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001';

  return defineConfig({
    base,
    plugins: [react()],
    resolve: {
      // Compile shared TS as ESM in Vite; dist/index.js is CJS (for Node backend only).
      alias: {
        '@delayt/shared': sharedEntry,
      },
    },
    optimizeDeps: {
      include: ['@delayt/shared'],
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/r': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/r': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: false,
      assetsDir: 'assets',
      cssCodeSplit: true,
    },
  });
};


