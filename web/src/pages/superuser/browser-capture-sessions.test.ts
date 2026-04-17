import { afterEach, describe, expect, it } from 'vitest';
import {
  createBrowserCaptureSession,
  listBrowserCaptureSessions,
  readBrowserCaptureSession,
  saveBrowserCaptureSession,
} from './browser-capture-sessions';

afterEach(() => {
  window.localStorage.clear();
});

describe('browser-capture-sessions', () => {
  it('stores browser-owned capture sessions in localStorage and returns summaries', () => {
    const session = createBrowserCaptureSession({
      name: 'Botpress Audit',
      cdpEndpoint: 'http://localhost:9222',
      storageDirectoryLabel: 'Capture Sessions',
      directoryHandleKey: 'capture-session:test:dir',
    });

    const summaries = listBrowserCaptureSessions();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].id).toBe(session.id);
    expect(summaries[0].name).toBe('Botpress Audit');
    expect(summaries[0].storageDirectoryLabel).toBe('Capture Sessions');
    expect(summaries[0].cdpEndpoint).toBe('http://localhost:9222');
    expect(summaries[0].captureCount).toBe(0);
  });

  it('persists appended captures and browser state updates', () => {
    const session = createBrowserCaptureSession({
      name: 'Botpress Audit',
      cdpEndpoint: 'http://localhost:9222',
      storageDirectoryLabel: 'Capture Sessions',
      directoryHandleKey: 'capture-session:test:dir',
    });

    saveBrowserCaptureSession({
      ...session,
      lastCapturedAt: '2026-04-16T17:25:00.000Z',
      browser: {
        ...session.browser,
        reachable: true,
        currentTargetUrl: 'https://botpress.com/studio',
        currentTargetTitle: 'Botpress Studio',
      },
      captures: [
        {
          id: 'capture-1',
          status: 'complete',
          capturedAt: '2026-04-16T17:25:00.000Z',
          pageUrl: 'https://botpress.com/studio',
          pageTitle: 'Botpress Studio',
          viewportWidth: 1920,
          viewportHeight: 1080,
          reportRelativePath: 'captures/capture-1/report.json',
          viewportRelativePath: 'captures/capture-1/viewport.png',
          fullPageRelativePath: 'captures/capture-1/full-page.png',
        },
      ],
    });

    const stored = readBrowserCaptureSession(session.id);
    expect(stored?.captures).toHaveLength(1);
    expect(stored?.browser.currentTargetTitle).toBe('Botpress Studio');
    expect(listBrowserCaptureSessions()[0].captureCount).toBe(1);
  });
});
