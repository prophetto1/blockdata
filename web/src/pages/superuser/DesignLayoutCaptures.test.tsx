import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Component as DesignLayoutCaptures } from './DesignLayoutCaptures';
import * as browserCaptureSessions from './browser-capture-sessions';
import * as captureWorkerApi from './capture-worker.api';
import * as captureServerDevControl from './capture-server-dev-control';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
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
    const endpointInput = screen.getByLabelText('Chrome DevTools endpoint');

    fireEvent.change(nameInput, { target: { value: 'Botpress audit session' } });
    fireEvent.change(endpointInput, { target: { value: 'http://localhost:9222' } });

    expect(nameInput).toHaveValue('Botpress audit session');
    expect(endpointInput).toHaveValue('http://localhost:9222');
  });
});
