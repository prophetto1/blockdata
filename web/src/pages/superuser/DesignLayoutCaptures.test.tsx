import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Component as DesignLayoutCaptures } from './DesignLayoutCaptures';
import * as browserCaptureSessions from './browser-capture-sessions';
import * as captureWorkerApi from './capture-worker.api';
import * as captureServerDevControl from './capture-server-dev-control';
import * as fsAccess from '@/lib/fs-access';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/lib/fs-access', () => ({
  pickDirectory: vi.fn(),
  saveDirectoryHandle: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DesignLayoutCaptures', () => {
  it('shows a recovery notice when a stale session route redirects back to the browser-owned list', async () => {
    vi.spyOn(browserCaptureSessions, 'listBrowserCaptureSessions').mockReturnValue([]);
    vi.spyOn(captureWorkerApi, 'fetchCaptureWorkerStatus').mockResolvedValue({ ok: true });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/app/superuser/design-layout-captures',
            state: {
              captureSessionNotice: 'Session browser-session-missing not found. Returned to Capture Sessions.',
            },
          },
        ]}
      >
        <Routes>
          <Route path="/app/superuser/design-layout-captures" element={<DesignLayoutCaptures />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Session browser-session-missing not found. Returned to Capture Sessions.')).toBeInTheDocument();
  });

  it('renders browser-owned sessions from local storage and shows worker readiness', async () => {
    vi.spyOn(browserCaptureSessions, 'listBrowserCaptureSessions').mockReturnValue([
      {
        id: 'session-20260416-101500',
        name: 'Botpress Audit',
        status: 'ready',
        createdAt: '2026-04-16T17:15:00.000Z',
        updatedAt: '2026-04-16T17:15:00.000Z',
        lastCapturedAt: '2026-04-16T17:20:00.000Z',
        storageDirectoryLabel: 'Capture Sessions',
        captureCount: 2,
        cdpEndpoint: 'http://localhost:9222',
        debugPort: 9222,
        currentTargetUrl: 'https://botpress.com/studio',
        currentTargetTitle: 'Botpress Studio',
      },
    ]);
    vi.spyOn(captureWorkerApi, 'fetchCaptureWorkerStatus').mockResolvedValue({ ok: true });

    render(
      <MemoryRouter>
        <DesignLayoutCaptures />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Botpress Audit')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Capture Sessions' })).toBeInTheDocument();
    expect(screen.getByText('Worker ready')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:9222')).toBeInTheDocument();
  });

  it('shows a manual start button and retries worker status when the helper is unavailable', async () => {
    vi.spyOn(browserCaptureSessions, 'listBrowserCaptureSessions').mockReturnValue([]);
    vi.spyOn(captureServerDevControl, 'isCaptureServerDevControlEnabled').mockReturnValue(true);
    vi.spyOn(captureServerDevControl, 'startCaptureServer').mockResolvedValue({
      ok: true,
      message: 'Capture worker started on port 4488',
    });

    const fetchStatusMock = vi
      .spyOn(captureWorkerApi, 'fetchCaptureWorkerStatus')
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValue({ ok: true });

    render(
      <MemoryRouter>
        <DesignLayoutCaptures />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Capture worker not ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Capture Server to bring the local helper online/i)).toBeInTheDocument();
    expect(screen.getByText('Setup needed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start Capture Server' }));

    await waitFor(() => {
      expect(fetchStatusMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Capture worker started on port 4488')).toBeInTheDocument();
    });
  });

  it('lets the user type into the new-session dialog without crashing', async () => {
    vi.spyOn(browserCaptureSessions, 'listBrowserCaptureSessions').mockReturnValue([]);
    vi.spyOn(captureWorkerApi, 'fetchCaptureWorkerStatus').mockResolvedValue({ ok: true });

    render(
      <MemoryRouter>
        <DesignLayoutCaptures />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'New Session' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New Session' }));

    const nameInput = await screen.findByLabelText('Session name');
    const launchUrlInput = screen.getByLabelText('Launch URL');

    fireEvent.change(nameInput, { target: { value: 'Botpress audit session' } });
    fireEvent.change(launchUrlInput, { target: { value: 'http://127.0.0.1:5374/app/superuser' } });

    expect(nameInput).toHaveValue('Botpress audit session');
    expect(launchUrlInput).toHaveValue('http://127.0.0.1:5374/app/superuser');
  });

  it('launches a capture browser before creating a new browser-owned session', async () => {
    vi.spyOn(browserCaptureSessions, 'listBrowserCaptureSessions').mockReturnValue([]);
    vi.spyOn(captureWorkerApi, 'fetchCaptureWorkerStatus').mockResolvedValue({ ok: true });
    vi.spyOn(fsAccess, 'pickDirectory').mockResolvedValue({ name: 'Capture Sessions' } as FileSystemDirectoryHandle);
    vi.spyOn(fsAccess, 'saveDirectoryHandle').mockResolvedValue();

    const launchSpy = vi.spyOn(captureWorkerApi, 'launchCaptureBrowser').mockResolvedValue({
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
    });
    const createSpy = vi.spyOn(browserCaptureSessions, 'createBrowserCaptureSession');

    render(
      <MemoryRouter>
        <DesignLayoutCaptures />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'New Session' }));
    fireEvent.change(await screen.findByLabelText('Session name'), {
      target: { value: 'AGChain Platform Capture' },
    });
    fireEvent.change(screen.getByLabelText('Launch URL'), {
      target: { value: 'http://127.0.0.1:5374/app/agchain/overview' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Choose Folder' }));
    expect(await screen.findByText('Capture Sessions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start Session' }));

    await waitFor(() => {
      expect(launchSpy).toHaveBeenCalledWith({
        launchUrl: 'http://127.0.0.1:5374/app/agchain/overview',
      });
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AGChain Platform Capture',
          cdpEndpoint: 'http://127.0.0.1:9333',
          storageDirectoryLabel: 'Capture Sessions',
          browserPid: 4567,
          userDataDir: 'C:\\temp\\capture-browser-9333',
          launchUrl: 'http://127.0.0.1:5374/app/agchain/overview',
          chromeExecutable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          launchedAt: '2026-04-17T09:15:00.000Z',
        }),
      );
    });

    expect(launchSpy.mock.invocationCallOrder[0]).toBeLessThan(createSpy.mock.invocationCallOrder[0]);
  });

  it('recovers an unreachable stored session before opening it from the list', async () => {
    vi.spyOn(browserCaptureSessions, 'listBrowserCaptureSessions').mockReturnValue([
      {
        id: 'session-20260416-101500',
        name: 'Botpress Audit',
        status: 'browser-unreachable',
        createdAt: '2026-04-16T17:15:00.000Z',
        updatedAt: '2026-04-16T17:15:00.000Z',
        lastCapturedAt: null,
        storageDirectoryLabel: 'Capture Sessions',
        captureCount: 0,
        cdpEndpoint: 'http://127.0.0.1:9222',
        debugPort: 9222,
        currentTargetUrl: null,
        currentTargetTitle: null,
      },
    ]);
    vi.spyOn(browserCaptureSessions, 'readBrowserCaptureSession').mockReturnValue({
      id: 'session-20260416-101500',
      name: 'Botpress Audit',
      status: 'browser-unreachable',
      createdAt: '2026-04-16T17:15:00.000Z',
      updatedAt: '2026-04-16T17:15:00.000Z',
      lastCapturedAt: null,
      storageDirectoryLabel: 'Capture Sessions',
      directoryHandleKey: 'capture-session:session-20260416-101500:dir',
      captureCount: 0,
      cdpEndpoint: 'http://127.0.0.1:9222',
      debugPort: 9222,
      currentTargetUrl: null,
      currentTargetTitle: null,
      target: null,
      browser: {
        cdpEndpoint: 'http://127.0.0.1:9222',
        debugPort: 9222,
        reachable: false,
        currentTargetUrl: null,
        currentTargetTitle: null,
        lastError: 'Failed to fetch',
        browserPid: 1234,
        userDataDir: 'C:\\temp\\capture-browser-9222',
        launchUrl: 'http://127.0.0.1:5374/app/agchain/overview',
        chromeExecutable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        launchedAt: '2026-04-16T17:15:00.000Z',
      },
      captures: [],
    });
    vi.spyOn(browserCaptureSessions, 'saveBrowserCaptureSession').mockImplementation((session) => session);
    vi.spyOn(captureWorkerApi, 'fetchCaptureWorkerStatus').mockResolvedValue({ ok: true });
    const recoverSpy = vi.spyOn(captureWorkerApi, 'recoverCaptureBrowser').mockResolvedValue({
      cdpEndpoint: 'http://127.0.0.1:9222',
      debugPort: 9222,
      reachable: true,
      currentTargetUrl: 'http://127.0.0.1:5374/app/agchain/overview',
      currentTargetTitle: 'BlockData',
      lastError: null,
      browserPid: 9876,
      userDataDir: 'C:\\temp\\capture-browser-9222',
      launchUrl: 'http://127.0.0.1:5374/app/agchain/overview',
      chromeExecutable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      launchedAt: '2026-04-17T09:20:00.000Z',
    });

    render(
      <MemoryRouter initialEntries={['/app/superuser/design-layout-captures']}>
        <Routes>
          <Route path="/app/superuser/design-layout-captures" element={<DesignLayoutCaptures />} />
          <Route path="/app/superuser/design-layout-captures/:sessionId" element={<div>Capture Session Detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Open' }));

    expect(await screen.findByText('Capture Session Detail')).toBeInTheDocument();
    expect(recoverSpy).toHaveBeenCalledWith({
      cdpEndpoint: 'http://127.0.0.1:9222',
      debugPort: 9222,
      userDataDir: 'C:\\temp\\capture-browser-9222',
      launchUrl: 'http://127.0.0.1:5374/app/agchain/overview',
    });
  });
});
