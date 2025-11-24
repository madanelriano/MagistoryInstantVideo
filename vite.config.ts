import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third argument '' allows loading variables without VITE_ prefix (like API_KEY)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    define: {
      // SECURITY FIX: Only expose specific required variables to the client bundle.
      // Do not use 'process.env': process.env as it leaks all system secrets.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      'process.env.PEXELS_API_KEY': JSON.stringify(env.PEXELS_API_KEY || process.env.PEXELS_API_KEY),
      
      // Polyfill process.env as an empty object for compatibility with libraries
      // that might access it, without exposing actual environment data.
      'process.env': JSON.stringify({})
    },
    server: {
      host: true,
    }
  };
});