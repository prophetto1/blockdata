import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Component as DesignLayoutCaptureSession } from './DesignLayoutCaptureSession';
import * as browserCaptureSessions from './browser-capture-sessions';
import * as captureWorkerApi from './capture-worker.api';
import * as captureSessionFiles from './capture-session-files';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

const sessionDetail = {
  id: 'session-20260416-101500',
  name: 'Botpress Audit',
  status: 'ready' as const,
  createdAt: '2026-04-16T17:15:00.000Z',
  updatedAt: '2026-04-16T17:20:00.000Z',
  lastCapturedAt: null,
  storageDirectoryLabel: 'Capture Sessions',
  directoryHandleKey: 'capture-session:session-20260416-101500:dir',
  captureCount: 0,
  cdpEndpoint: 'http://localhost:9222',
  debugPort: 9222,
  currentTargetUrl: null,
  currentTargetTitle: null,
  target: null,
  browser: {
    cdpEndpoint: 'http://localhost:9222',
    debugPort: 9222,
    reachable: true,
    currentTargetUrl: 'https://botpress.com/studio',
    currentTargetTitle: 'Botpress Studio',
    lastError: null,
  },
  captures: [],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DesignLayoutCaptureSession', () => {
  it('redirects back to the sessions list when the requested browser-owned session is missing', async () => {
    vi.spyOn(browserCaptureSessions, 'readBrowserCaptureSession').mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/app/superuser/design-layout-captures/browser-session-missing']}>
        <Routes>
          <Route path="/app/superuser/design-layout-captures" element={<div>Capture Sessions Landing</div>} />
          <Route path="/app/superuser/design-layout-captures/:sessionId" element={<DesignLayoutCaptureSession />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Capture Sessions Landing')).toBeInTheDocument();
  });

  it('renders browser-owned session metadata and probe state', async () => {
    vi.spyOn(browserCaptureSessions, 'readBrowserCaptureSession').mockReturnValue(sessionDetail);
    vi.spyOn(captureWorkerApi, 'probeCaptureBrowser').mockResolvedValue({
      reachable: true,
      currentTargetUrl: 'https://botpress.com/studio',
      currentTargetTitle: 'Botpress Studio',
    });

    render(
      <MemoryRouter initialEntries={['/app/superuser/design-layout-captures/session-20260416-101500']}>
        <Routes>
          <Route path="/app/superuser/design-layout-captures/:sessionId" element={<DesignLayoutCaptureSession />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Live Browser Connection')).toBeInTheDocument();
    expect(screen.getByText('Live Browser Page')).toBeInTheDocument();
    expect(screen.getByText('Pinned Target')).toBeInTheDocument();
    expect(screen.getAllByText('Botpress Studio').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Capture Sessions')).toBeInTheDocument();
  });

  it('shows a live-browser refresh placeholder instead of stale stored page details while probing', async () => {
    let resolveProbe: ((value: { reachable: boolean; currentTargetUrl: string; currentTargetTitle: string }) => void) | null = null;
    const staleSession = {
      ...sessionDetail,
      browser: {
        ...sessionDetail.browser,
        currentTargetUrl: 'http://127.0.0.1:5374/app/superuser/design-layout-captures/browser-session-stale',
        currentTargetTitle: 'Stale Controller Page',
      },
    };

    vi.spyOn(browserCaptureSessions, 'readBrowserCaptureSession').mockReturnValue(staleSession);
    vi.spyOn(captureWorkerApi, 'probeCaptureBrowser').mockReturnValue(
      new Promise((resolve) => {
        resolveProbe = resolve;
      }),
    );

    render(
      <MemoryRouter initialEntries={['/app/superuser/design-layout-captures/session-20260416-101500']}>
        <Routes>
          <Route path="/app/superuser/design-layout-captures/:sessionId" element={<DesignLayoutCaptureSession />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Live Browser Connection')).toBeInTheDocument();
    expect(screen.getByText('Refreshing live browser state...')).toBeInTheDocument();
    expect(screen.queryByText('Stale Controller Page')).not.toBeInTheDocument();

    resolveProbe?.({
      reachable: true,
      currentTargetUrl: 'http://127.0.0.1:5374/app/agchain/overview',
      currentTargetTitle: 'BlockData',
    });

    await screen.findByText('BlockData');
    expect(screen.queryByText('Refreshing live browser state...')).not.toBeInTheDocument();
  });

  it('keeps capture disabled until a target tab has been selected for the session', async () => {
    vi.spyOn(browserCaptureSessions, 'readBrowserCaptureSession').mockReturnValue(sessionDetail);
    vi.spyOn(captureWorkerApi, 'probeCaptureBrowser').mockResolvedValue({
      reachable: true,
      currentTargetUrl: 'https://botpress.com/studio',
      currentTargetTitle: 'Botpress Studio',
    });

    render(
      <MemoryRouter initialEntries={['/app/superuser/design-layout-captures/session-20260416-101500']}>
        <Routes>
          <Route path="/app/superuser/design-layout-captures/:sessionId" element={<DesignLayoutCaptureSession />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Live Browser Connection')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capture' })).toBeDisabled();
  });

  it('runs the worker and saves returned artifacts through the browser-owned file pipeline', async () => {
    vi.spyOn(captureSessionFiles, 'getCaptureSessionDirectoryHandle').mockResolvedValue({} as FileSystemDirectoryHandle);
    const saveCaptureArtifactsMock = vi.spyOn(captureSessionFiles, 'saveCaptureArtifacts').mockResolvedValue({
      reportRelativePath: 'captures/capture-1/report.json',
      viewportRelativePath: 'captures/capture-1/viewport.png',
      fullPageRelativePath: null,
    });
    const saveSessionManifestMock = vi.spyOn(captureSessionFiles, 'saveSessionManifest').mockResolvedValue();

    const readSessionMock = vi
      .spyOn(browserCaptureSessions, 'readBrowserCaptureSession')
      .mockReturnValueOnce({
        ...sessionDetail,
        target: {
          id: 'target-eval-designer',
          url: 'https://botpress.com/studio',
          title: 'Botpress Studio',
        },
      })
      .mockReturnValue({
        ...sessionDetail,
        captureCount: 1,
        lastCapturedAt: '2026-04-16T17:25:00.000Z',
        target: {
          id: 'target-eval-designer',
          url: 'https://botpress.com/studio',
          title: 'Botpress Studio',
        },
        browser: {
          ...sessionDetail.browser,
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
            fullPageRelativePath: null,
          },
        ],
      });

    vi.spyOn(browserCaptureSessions, 'saveBrowserCaptureSession').mockImplementation((nextSession) => nextSession);
    vi.spyOn(captureWorkerApi, 'probeCaptureBrowser').mockResolvedValue({
      reachable: true,
      currentTargetUrl: 'https://botpress.com/studio',
      currentTargetTitle: 'Botpress Studio',
    });
    vi.spyOn(captureWorkerApi, 'runCaptureWorker').mockResolvedValue({
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
    });

    render(
      <MemoryRouter initialEntries={['/app/superuser/design-layout-captures/session-20260416-101500']}>
        <Routes>
          <Route path="/app/superuser/design-layout-captures/:sessionId" element={<DesignLayoutCaptureSession />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('0 stored')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));

    await waitFor(() => {
      expect(saveCaptureArtifactsMock).toHaveBeenCalledTimes(1);
      expect(saveSessionManifestMock).toHaveBeenCalledTimes(1);
      expect(readSessionMock).toHaveBeenCalled();
      expect(captureWorkerApi.runCaptureWorker).toHaveBeenCalledWith('http://localhost:9222', 'target-eval-designer');
    });
  });
});
