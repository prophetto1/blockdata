import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  CAPTURE_SERVER_START_ROUTE,
  captureServerDevControlPlugin,
} from './captureServerDevControl';

type MiddlewareHandler = (req: IncomingMessage, res: ServerResponse) => void;

function createFakeServer() {
  const routes = new Map<string, MiddlewareHandler>();
  return {
    routes,
    server: {
      middlewares: {
        use(routePath: string, handler: MiddlewareHandler) {
          routes.set(routePath, handler);
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

describe('captureServerDevControlPlugin', () => {
  it('registers the fixed start route', () => {
    const { server, routes } = createFakeServer();
    const plugin = captureServerDevControlPlugin({ projectRoot: 'E:/writing-system' });

    plugin.configureServer?.(server as never);

    expect(routes.has(CAPTURE_SERVER_START_ROUTE)).toBe(true);
  });

  it('rejects non-local requests before invoking PowerShell', () => {
    const execFileImpl = vi.fn();
    const { server, routes } = createFakeServer();
    const plugin = captureServerDevControlPlugin({
      projectRoot: 'E:/writing-system',
      execFileImpl: execFileImpl as never,
    });

    plugin.configureServer?.(server as never);
    const handler = routes.get(CAPTURE_SERVER_START_ROUTE);
    const { response, getBody } = createResponse();

    handler?.(createRequest('POST', '10.0.0.5'), response);

    expect(response.statusCode).toBe(403);
    expect(getBody()).toContain('Local requests only');
    expect(execFileImpl).not.toHaveBeenCalled();
  });

  it('rejects unsupported methods on the fixed route', () => {
    const execFileImpl = vi.fn();
    const { server, routes } = createFakeServer();
    const plugin = captureServerDevControlPlugin({
      projectRoot: 'E:/writing-system',
      execFileImpl: execFileImpl as never,
    });

    plugin.configureServer?.(server as never);

    const route = routes.get(CAPTURE_SERVER_START_ROUTE);
    const statusResponse = createResponse();

    route?.(createRequest('GET'), statusResponse.response);

    expect(statusResponse.response.statusCode).toBe(405);
    expect(execFileImpl).not.toHaveBeenCalled();
  });

  it('invokes the fixed PowerShell contract for start', () => {
    const execFileImpl = vi.fn((file, args, options, callback) => {
      callback(null, 'Capture server started on port 4488', '');
    });
    const { server, routes } = createFakeServer();
    const plugin = captureServerDevControlPlugin({
      projectRoot: 'E:/writing-system',
      execFileImpl: execFileImpl as never,
      powershellExecutable: 'powershell.exe',
    });

    plugin.configureServer?.(server as never);
    const handler = routes.get(CAPTURE_SERVER_START_ROUTE);
    const { response, getBody, getHeader } = createResponse();

    handler?.(createRequest('POST'), response);

    expect(execFileImpl).toHaveBeenCalledTimes(1);
    const [file, args, options] = execFileImpl.mock.calls[0];
    expect(file).toBe('powershell.exe');
    expect(args).toEqual([
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.resolve('E:/writing-system', 'scripts', 'start-capture-server.ps1'),
    ]);
    expect(options).toEqual({ cwd: 'E:/writing-system' });
    expect(response.statusCode).toBe(200);
    expect(getHeader('Content-Type')).toBe('application/json');
    expect(getBody()).toContain('"ok":true');
    expect(getBody()).toContain('Capture server started on port 4488');
  });
});
