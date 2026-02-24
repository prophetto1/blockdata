import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/spine-api': {
        target: 'http://127.0.0.1:8911',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/spine-api/, ''),
      },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
