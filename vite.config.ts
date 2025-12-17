import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Cast process to any because TS might complain about missing 'cwd' in standard Process type
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Explicitly define process.env.API_KEY so it's available in the browser code
      // This maps the build-time environment variable (from Netlify or .env) to the client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
    },
  };
});