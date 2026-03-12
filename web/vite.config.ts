import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execFile } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'

function superuserToolsPlugin() {
  return {
    name: 'superuser-tools',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__admin/refresh-component-inventory', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        const remoteAddress = req.socket.remoteAddress ?? ''
        const isLocal =
          remoteAddress === '127.0.0.1' ||
          remoteAddress === '::1' ||
          remoteAddress.endsWith('127.0.0.1')

        if (!isLocal) {
          res.statusCode = 403
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Local requests only' }))
          return
        }

        const scriptPath = path.resolve(__dirname, 'scripts', 'generate-component-inventory.mjs')
        execFile(process.execPath, [scriptPath], { cwd: __dirname }, (error, stdout, stderr) => {
          res.setHeader('Content-Type', 'application/json')
          if (error) {
            res.statusCode = 500
            res.end(
              JSON.stringify({
                error: stderr?.trim() || error.message || 'Failed to refresh inventory',
              }),
            )
            return
          }

          res.statusCode = 200
          res.end(
            JSON.stringify({
              ok: true,
              message: stdout.trim(),
            }),
          )
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), superuserToolsPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@front': path.resolve(__dirname, '../front/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5274,
    strictPort: false,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/oo-api': {
        target: 'http://localhost:9980',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/oo-api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        scalarClientHost: fileURLToPath(new URL('./scalar-client-host.html', import.meta.url)),
      },
    },
  },
})
