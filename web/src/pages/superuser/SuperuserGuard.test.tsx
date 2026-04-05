import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  AgchainAdminGuard,
  BlockdataAdminGuard,
  SuperuserGuard,
} from './SuperuserGuard';

type AccessState = {
  access: { blockdataAdmin: boolean; agchainAdmin: boolean; superuser: boolean } | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  refresh: () => Promise<void>;
};

const useAdminSurfaceAccessStateMock = vi.fn<() => AccessState>(() => ({
  access: {
    blockdataAdmin: false,
    agchainAdmin: false,
    superuser: false,
  },
  status: 'ready',
  error: null,
  refresh: vi.fn(),
}));

vi.mock('@/hooks/useAdminSurfaceAccess', () => ({
  useAdminSurfaceAccessState: () => useAdminSurfaceAccessStateMock(),
}));

afterEach(() => {
  cleanup();
  useAdminSurfaceAccessStateMock.mockReset();
  useAdminSurfaceAccessStateMock.mockReturnValue({
    access: {
      blockdataAdmin: false,
      agchainAdmin: false,
      superuser: false,
    },
    status: 'ready',
    error: null,
    refresh: vi.fn(),
  });
});

function renderGuard(
  path: string,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app" element={<div data-testid="app-home">app home</div>} />
        <Route path="/app/blockdata-admin/*" element={<BlockdataAdminGuard />}>
          <Route path="*" element={<div data-testid="protected-surface">blockdata admin</div>} />
        </Route>
        <Route path="/app/agchain-admin/*" element={<AgchainAdminGuard />}>
          <Route path="*" element={<div data-testid="protected-surface">agchain admin</div>} />
        </Route>
        <Route path="/app/superuser/*" element={<SuperuserGuard />}>
          <Route path="*" element={<div data-testid="protected-surface">superuser</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('SuperuserGuard surfaces', () => {
  it('shows a verification state while access is still resolving', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: null,
      status: 'loading',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByText(/verifying access/i)).toBeInTheDocument();
  });

  it('allows a blockdata-only admin into the blockdata admin surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: false,
        superuser: false,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('blockdata admin');
  });

  it('does not let a superuser-only persona into the blockdata admin surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: false,
        agchainAdmin: false,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByTestId('app-home')).toBeInTheDocument();
  });

  it('allows an agchain-only admin into the AGChain admin surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: false,
        agchainAdmin: true,
        superuser: false,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/agchain-admin/models');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('agchain admin');
  });

  it('does not let a blockdata-only persona into the AGChain admin surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: false,
        superuser: false,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/agchain-admin/models');

    expect(screen.getByTestId('app-home')).toBeInTheDocument();
  });

  it('allows a superuser-only persona into the superuser surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: false,
        agchainAdmin: false,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/superuser/operational-readiness');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('superuser');
  });

  it('does not keep showing verification after the access probe has failed', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: null,
      status: 'error',
      error: 'network down',
      refresh: vi.fn(),
    });

    renderGuard('/app/superuser/operational-readiness');

    expect(screen.getByText(/unable to verify admin access/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('preserves a previously resolved surface grant even when a background refresh has errored', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: false,
        superuser: false,
      },
      status: 'ready',
      error: 'network down',
      refresh: vi.fn(),
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('blockdata admin');
  });
});
