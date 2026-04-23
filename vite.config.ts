import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: '/grambo-family-app/',
  plugins: [preact({ devToolsEnabled: false })],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  },
});
