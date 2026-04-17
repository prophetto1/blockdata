import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { once } from 'node:events';
import { chooseCaptureTarget, createServer, isBrowserInternalUrl } from './capture-server.mjs';

test('chooseCaptureTarget skips internal browser pages and selects the first capture-eligible page', () => {
  const target = chooseCaptureTarget([
    { type: 'page', url: 'chrome://newtab/' },
    { type: 'service_worker', url: 'https://example.com/worker.js' },
    { type: 'page', url: 'https://example.com/dashboard', title: 'Dashboard' },
    { type: 'page', url: 'https://example.com/ignored', title: 'Ignored' },
  ]);

  assert.equal(isBrowserInternalUrl('chrome://newtab/'), true);
  assert.equal(isBrowserInternalUrl('https://example.com/dashboard'), false);
  assert.deepEqual(target, {
    type: 'page',
    url: 'https://example.com/dashboard',
    title: 'Dashboard',
  });
});

test('chooseCaptureTarget excludes superuser capture routes and honors a pinned target id', () => {
  const targets = [
    {
      id: 'capture-session-page',
      type: 'page',
      url: 'http://127.0.0.1:5374/app/superuser/design-layout-captures/browser-session-20260416-212728-5jzx',
      title: 'Capture Session',
    },
    {
      id: 'target-overview',
      type: 'page',
      url: 'http://127.0.0.1:5374/app/agchain/overview',
      title: 'Overview',
    },
    {
      id: 'target-eval-designer',
      type: 'page',
      url: 'http://127.0.0.1:5374/app/agchain/eval-designer',
      title: 'Eval Designer',
    },
  ];

  assert.deepEqual(chooseCaptureTarget(targets), {
    id: 'target-overview',
    type: 'page',
    url: 'http://127.0.0.1:5374/app/agchain/overview',
    title: 'Overview',
  });

  assert.deepEqual(chooseCaptureTarget(targets, { targetId: 'target-eval-designer' }), {
    id: 'target-eval-designer',
    type: 'page',
    url: 'http://127.0.0.1:5374/app/agchain/eval-designer',
    title: 'Eval Designer',
  });
});

test('createServer exposes the browser-owned worker status endpoint', async (t) => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  assert.equal(typeof port, 'number');

  const statusResponse = await fetch(`http://127.0.0.1:${port}/capture-worker/status`);
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.equal(status.ok, true);
});

test('createServer delegates capture runs to the injected worker implementation', async (t) => {
  const calls = [];
  const server = createServer({
    runCaptureWorker: async (payload) => {
      calls.push(payload);
      return {
        captureId: 'capture-1',
        capturedAt: '2026-04-16T17:25:00.000Z',
        pageUrl: 'https://botpress.com/studio',
        pageTitle: 'Botpress Studio',
        viewportWidth: 1920,
        viewportHeight: 1080,
        currentTargetUrl: 'https://botpress.com/studio',
        currentTargetTitle: 'Botpress Studio',
        report: { capture: { page: { url: 'https://botpress.com/studio' } } },
        reportFileName: 'report.json',
        viewportScreenshot: {
          fileName: 'viewport.png',
          mimeType: 'image/png',
          base64: 'ZmFrZS12aWV3cG9ydA==',
        },
        fullPageScreenshot: null,
      };
    },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  assert.equal(typeof port, 'number');

  const response = await fetch(`http://127.0.0.1:${port}/capture-worker/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cdpEndpoint: 'http://localhost:9222', targetId: 'target-eval-designer' }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.capture.captureId, 'capture-1');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { cdpEndpoint: 'http://localhost:9222', targetId: 'target-eval-designer' });
});

test('createServer exposes a browser launch endpoint for browser-owned sessions', async (t) => {
  const calls = [];
  const server = createServer({
    launchCaptureBrowser: async (payload) => {
      calls.push(payload);
      return {
        cdpEndpoint: 'http://127.0.0.1:9333',
        debugPort: 9333,
        reachable: true,
        currentTargetUrl: 'about:blank',
        currentTargetTitle: 'about:blank',
        lastError: null,
        browserPid: 4567,
        userDataDir: 'C:\\temp\\capture-browser-9333',
        launchUrl: 'http://127.0.0.1:5374/app/agchain/overview',
        chromeExecutable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        launchedAt: '2026-04-17T09:15:00.000Z',
      };
    },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  assert.equal(typeof port, 'number');

  const response = await fetch(`http://127.0.0.1:${port}/capture-browser/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ launchUrl: 'http://127.0.0.1:5374/app/agchain/overview' }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.browser.cdpEndpoint, 'http://127.0.0.1:9333');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { launchUrl: 'http://127.0.0.1:5374/app/agchain/overview' });
});

test('createServer exposes a browser recovery endpoint for unreachable browser-owned sessions', async (t) => {
  const calls = [];
  const server = createServer({
    recoverCaptureBrowser: async (payload) => {
      calls.push(payload);
      return {
        cdpEndpoint: 'http://127.0.0.1:9222',
        debugPort: 9222,
        reachable: true,
        currentTargetUrl: 'http://127.0.0.1:5374/app/agchain/eval-designer',
        currentTargetTitle: 'Eval Designer',
        lastError: null,
        browserPid: 9876,
        userDataDir: 'C:\\temp\\capture-browser-9222',
        launchUrl: 'http://127.0.0.1:5374/app/agchain/overview',
        chromeExecutable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        launchedAt: '2026-04-17T09:30:00.000Z',
      };
    },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  assert.equal(typeof port, 'number');

  const response = await fetch(`http://127.0.0.1:${port}/capture-browser/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cdpEndpoint: 'http://127.0.0.1:9222',
      debugPort: 9222,
      userDataDir: 'C:\\temp\\capture-browser-9222',
      launchUrl: 'http://127.0.0.1:5374/app/agchain/overview',
    }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.browser.currentTargetTitle, 'Eval Designer');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    cdpEndpoint: 'http://127.0.0.1:9222',
    debugPort: 9222,
    userDataDir: 'C:\\temp\\capture-browser-9222',
    launchUrl: 'http://127.0.0.1:5374/app/agchain/overview',
  });
});

test('capture server is wired to the v2 layout measurement worker', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'scripts', 'capture-server.mjs'), 'utf8');

  assert.match(source, /measure-layout-headed-v2\.mjs/);
});
