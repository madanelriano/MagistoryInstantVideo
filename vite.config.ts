import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  define: {
    // Polyfill process.env for local development to prevent "process is not defined" error
    'process.env': process.env
  },
  server: {
    host: true,
  }
});