import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execFile } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'

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
