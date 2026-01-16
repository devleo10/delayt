import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001';

  return defineConfig({
    base,
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
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


