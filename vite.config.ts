import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  appType: 'mpa',
  build: {
    sourcemap: false,
    copyPublicDir: !isSsrBuild,
    rolldownOptions: isSsrBuild
      ? {}
      : {
          input: {
            index: fileURLToPath(new URL('./index.html', import.meta.url)),
            '404': fileURLToPath(new URL('./404.html', import.meta.url)),
          },
        },
  },
}));
