import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Route-level code splitting is handled by React.lazy in App.tsx.
    // These manual chunks keep the vendor layer stable across deploys so
    // returning visitors re-download only app code.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Match on the path rather than the package name, so deep entry
          // points (react-dom/client, i18next-*) land in the right chunk
          // instead of being pulled into the entry bundle.
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'react';
          if (/node_modules\/(i18next|react-i18next)/.test(id)) return 'i18n';
          if (/node_modules\/@supabase/.test(id)) return 'supabase';
          return undefined;
        },
      },
    },
  },
});
