import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The official FPL API does not send CORS headers for browser requests, so the
// app always calls the relative path '/api/...'. Locally that path is proxied by
// the dev/preview server; on Vercel the same path is proxied by the rewrites in
// vercel.json. Keep both in sync when changing this.
const fplApiProxy = {
  target: 'https://fantasy.premierleague.com',
  changeOrigin: true,
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': fplApiProxy,
    },
  },
  preview: {
    proxy: {
      '/api': fplApiProxy,
    },
  },
});
