import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Proxies /api to the backend during development so the frontend never
// needs CORS configured differently for local vs. deployed use.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5050',
          changeOrigin: true
        }
      }
    }
  };
});
