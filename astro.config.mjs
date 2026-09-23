import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  server: {
    host: 'localhost',
    port: 4321,
    strictPort: true,
  },
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
  },
});
