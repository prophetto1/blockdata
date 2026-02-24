import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@front': path.resolve(__dirname, '../front/src'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/docs': {
        target: 'http://localhost:4321',
        changeOrigin: true,
      },
      '/_image': {
        target: 'http://localhost:4321',
        changeOrigin: true,
      },
    },
  },
})
