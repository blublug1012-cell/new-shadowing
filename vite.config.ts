import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // SECURITY FIX: Change third argument from '' to 'VITE_'
  // This prevents loading sensitive system variables (like Netlify tokens) which triggers the "Exposed secrets detected" build error.
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // We explicitly grab the API key from the specific variables we care about.
  // Priority: VITE_API_KEY (from .env or Netlify vars) -> API_KEY (legacy Netlify var)
  const apiKey = env.VITE_API_KEY || process.env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Injects the key safely into the client code
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});