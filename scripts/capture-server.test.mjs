import assert from 'node:assert/strict';
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
    body: JSON.stringify({ cdpEndpoint: 'http://localhost:9222' }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.capture.captureId, 'capture-1');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { cdpEndpoint: 'http://localhost:9222' });
});
