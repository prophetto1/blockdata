import { execFile } from 'node:child_process';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

export const CAPTURE_SERVER_START_ROUTE = '/__admin/capture-server/start';

type ExecFileLike = typeof execFile;

type CaptureServerDevControlPluginOptions = {
  projectRoot: string;
  powershellExecutable?: string;
  execFileImpl?: ExecFileLike;
};

function isLocalRequest(req: IncomingMessage): boolean {
  const remoteAddress = req.socket.remoteAddress ?? '';
  return (
    remoteAddress === '127.0.0.1' ||
    remoteAddress === '::1' ||
    remoteAddress.endsWith('127.0.0.1')
  );
}

function sendJson(res: ServerResponse, statusCode: number, payload: Record<string, unknown>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function startCaptureServer(
  options: CaptureServerDevControlPluginOptions,
  callback: (statusCode: number, payload: Record<string, unknown>) => void,
) {
  const execFileImpl = options.execFileImpl ?? execFile;
  const powershellExecutable = options.powershellExecutable ?? 'powershell.exe';
  const scriptPath = path.resolve(options.projectRoot, 'scripts', 'start-capture-server.ps1');
  const args = ['-ExecutionPolicy', 'Bypass', '-File', scriptPath];

  execFileImpl(
    powershellExecutable,
    args,
    { cwd: options.projectRoot },
    (error, stdout, stderr) => {
      if (!error) {
        callback(200, {
          ok: true,
          message: stdout.trim() || 'Capture server start requested.',
        });
        return;
      }

      const detail = stderr?.trim() || stdout?.trim() || error.message || 'Failed to start capture server';
      callback(500, { error: detail });
    },
  );
}

export function captureServerDevControlPlugin(options: CaptureServerDevControlPluginOptions): Plugin {
  return {
    name: 'capture-server-dev-control',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(CAPTURE_SERVER_START_ROUTE, (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method Not Allowed' });
          return;
        }

        if (!isLocalRequest(req)) {
          sendJson(res, 403, { error: 'Local requests only' });
          return;
        }

        startCaptureServer(options, (statusCode, payload) => {
          sendJson(res, statusCode, payload);
        });
      });
    },
  };
}
