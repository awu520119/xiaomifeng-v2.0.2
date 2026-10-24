import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [react()],
  build: {
    outDir: '../assets',
    emptyOutDir: false,
    minify: true,
    lib: { entry: 'src/viewer.jsx', name: 'PrototypeViewer', formats: ['iife'], fileName: () => 'viewer.js' },
    rollupOptions: { external: [] },
  },
});
