import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  // Embed assets are hosted under `/meta-configurator-embed/` in the React app.
  // Without this, Vite emits absolute `/assets/...` URLs (e.g. validation worker) which won't resolve.
  base: '/meta-configurator-embed/',
  plugins: [
    vue(),
    vueJsx(),
    nodePolyfills({
      globals: {
        Buffer: false,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-embed',
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: fileURLToPath(new URL('./src/embed-entry.ts', import.meta.url)),
      name: 'MetaConfiguratorEmbed',
      formats: ['iife'],
      fileName: () => 'meta-configurator-embed.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'meta-configurator-embed.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'meta-configurator-embed.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
