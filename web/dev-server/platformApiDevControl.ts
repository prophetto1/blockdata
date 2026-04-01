import { execFile } from 'node:child_process';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

export const PLATFORM_API_STATUS_ROUTE = '/__admin/platform-api/status';
export const PLATFORM_API_RECOVER_ROUTE = '/__admin/platform-api/recover';

type ExecFileLike = typeof execFile;

type PlatformApiDevControlPluginOptions = {
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

function parseJsonOutput(stdout: string): Record<string, unknown> | null {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function runControlAction(
  action: 'status' | 'recover',
  options: PlatformApiDevControlPluginOptions,
  callback: (statusCode: number, payload: Record<string, unknown>) => void,
) {
  const execFileImpl = options.execFileImpl ?? execFile;
  const powershellExecutable = options.powershellExecutable ?? 'powershell.exe';
  const scriptPath = path.resolve(options.projectRoot, 'scripts', 'platform-api-dev-control.ps1');
  const args = ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Action', action];

  execFileImpl(
    powershellExecutable,
    args,
    { cwd: options.projectRoot },
    (error, stdout, stderr) => {
      const parsed = parseJsonOutput(stdout);
      if (parsed) {
        callback(200, parsed);
        return;
      }

      const message = stderr?.trim() || error?.message || `Failed to ${action} platform-api`;
      callback(500, { error: message });
    },
  );
}

function registerControlRoute(
  server: ViteDevServer,
  routePath: string,
  method: 'GET' | 'POST',
  action: 'status' | 'recover',
  options: PlatformApiDevControlPluginOptions,
) {
  server.middlewares.use(routePath, (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== method) {
      sendJson(res, 405, { error: 'Method Not Allowed' });
      return;
    }

    if (!isLocalRequest(req)) {
      sendJson(res, 403, { error: 'Local requests only' });
      return;
    }

    runControlAction(action, options, (statusCode, payload) => {
      sendJson(res, statusCode, payload);
    });
  });
}

export function platformApiDevControlPlugin(options: PlatformApiDevControlPluginOptions): Plugin {
  return {
    name: 'platform-api-dev-control',
    configureServer(server: ViteDevServer) {
      registerControlRoute(server, PLATFORM_API_STATUS_ROUTE, 'GET', 'status', options);
      registerControlRoute(server, PLATFORM_API_RECOVER_ROUTE, 'POST', 'recover', options);
    },
  };
}
