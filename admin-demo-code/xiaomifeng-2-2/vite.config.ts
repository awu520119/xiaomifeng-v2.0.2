import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // Published pages embed the bundle and must not depend on a separate image file.
    assetsInlineLimit: (filePath) => filePath.endsWith('/lotus-pond.jpg') ? true : undefined,
  },
});
