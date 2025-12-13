import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Simplified config: specific env handling is removed to satisfy Netlify's security scanner.
// Vite automatically exposes VITE_* variables via import.meta.env, which is safer.
export default defineConfig({
  plugins: [react()],
});