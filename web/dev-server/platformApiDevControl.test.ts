import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  PLATFORM_API_RECOVER_ROUTE,
  PLATFORM_API_STATUS_ROUTE,
  platformApiDevControlPlugin,
} from './platformApiDevControl';

type MiddlewareHandler = (req: IncomingMessage, res: ServerResponse) => void;

function createFakeServer() {
  const routes = new Map<string, MiddlewareHandler>();
  return {
    routes,
    server: {
      middlewares: {
        use(path: string, handler: MiddlewareHandler) {
          routes.set(path, handler);
        },
      },
    },
  };
}

function createRequest(method: string, remoteAddress = '127.0.0.1') {
  return {
    method,
    socket: { remoteAddress },
  } as IncomingMessage;
}

function createResponse() {
  const headers = new Map<string, string>();
  let body = '';

  return {
    response: {
      statusCode: 200,
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
      end(value?: string) {
        body = value ?? '';
      },
    } as unknown as ServerResponse,
    getBody: () => body,
    getHeader: (name: string) => headers.get(name),
  };
}

describe('platformApiDevControlPlugin', () => {
  it('registers the fixed status and recover routes', () => {
    const { server, routes } = createFakeServer();
    const plugin = platformApiDevControlPlugin({ projectRoot: 'E:/writing-system' });

    plugin.configureServer?.(server as never);

    expect(routes.has(PLATFORM_API_STATUS_ROUTE)).toBe(true);
    expect(routes.has(PLATFORM_API_RECOVER_ROUTE)).toBe(true);
  });

  it('rejects non-local requests before invoking PowerShell', () => {
    const execFileImpl = vi.fn();
    const { server, routes } = createFakeServer();
    const plugin = platformApiDevControlPlugin({
      projectRoot: 'E:/writing-system',
      execFileImpl: execFileImpl as never,
    });

    plugin.configureServer?.(server as never);
    const handler = routes.get(PLATFORM_API_STATUS_ROUTE);
    const { response, getBody } = createResponse();

    handler?.(createRequest('GET', '10.0.0.5'), response);

    expect(response.statusCode).toBe(403);
    expect(getBody()).toContain('Local requests only');
    expect(execFileImpl).not.toHaveBeenCalled();
  });

  it('rejects unsupported methods on each fixed route', () => {
    const execFileImpl = vi.fn();
    const { server, routes } = createFakeServer();
    const plugin = platformApiDevControlPlugin({
      projectRoot: 'E:/writing-system',
      execFileImpl: execFileImpl as never,
    });

    plugin.configureServer?.(server as never);

    const statusRoute = routes.get(PLATFORM_API_STATUS_ROUTE);
    const recoverRoute = routes.get(PLATFORM_API_RECOVER_ROUTE);
    const statusResponse = createResponse();
    const recoverResponse = createResponse();

    statusRoute?.(createRequest('POST'), statusResponse.response);
    recoverRoute?.(createRequest('GET'), recoverResponse.response);

    expect(statusResponse.response.statusCode).toBe(405);
    expect(recoverResponse.response.statusCode).toBe(405);
    expect(execFileImpl).not.toHaveBeenCalled();
  });

  it('invokes the fixed PowerShell contract for status', () => {
    const execFileImpl = vi.fn((file, args, options, callback) => {
      callback(null, '{"ok":true,"action":"recover_platform_api"}', '');
    });
    const { server, routes } = createFakeServer();
    const plugin = platformApiDevControlPlugin({
      projectRoot: 'E:/writing-system',
      execFileImpl: execFileImpl as never,
      powershellExecutable: 'powershell.exe',
    });

    plugin.configureServer?.(server as never);
    const handler = routes.get(PLATFORM_API_STATUS_ROUTE);
    const { response, getBody, getHeader } = createResponse();

    handler?.(createRequest('GET'), response);

    expect(execFileImpl).toHaveBeenCalledTimes(1);
    const [file, args, options] = execFileImpl.mock.calls[0];
    expect(file).toBe('powershell.exe');
    expect(args).toEqual([
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.resolve('E:/writing-system', 'scripts', 'platform-api-dev-control.ps1'),
      '-Action',
      'status',
    ]);
    expect(options).toEqual({ cwd: 'E:/writing-system' });
    expect(response.statusCode).toBe(200);
    expect(getHeader('Content-Type')).toBe('application/json');
    expect(getBody()).toContain('"ok":true');
  });

  it('invokes the fixed PowerShell contract for recover', () => {
    const execFileImpl = vi.fn((file, args, options, callback) => {
      callback(null, '{"ok":false,"result":"fail"}', '');
    });
    const { server, routes } = createFakeServer();
    const plugin = platformApiDevControlPlugin({
      projectRoot: 'E:/writing-system',
      execFileImpl: execFileImpl as never,
      powershellExecutable: 'powershell.exe',
    });

    plugin.configureServer?.(server as never);
    const handler = routes.get(PLATFORM_API_RECOVER_ROUTE);
    const { response, getBody } = createResponse();

    handler?.(createRequest('POST'), response);

    expect(execFileImpl).toHaveBeenCalledTimes(1);
    const [file, args, options] = execFileImpl.mock.calls[0];
    expect(file).toBe('powershell.exe');
    expect(args).toEqual([
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.resolve('E:/writing-system', 'scripts', 'platform-api-dev-control.ps1'),
      '-Action',
      'recover',
    ]);
    expect(options).toEqual({ cwd: 'E:/writing-system' });
    expect(response.statusCode).toBe(200);
    expect(getBody()).toContain('"result":"fail"');
  });
});
