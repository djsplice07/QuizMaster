import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded relatively (e.g., "assets/script.js" instead of "/assets/script.js")
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});