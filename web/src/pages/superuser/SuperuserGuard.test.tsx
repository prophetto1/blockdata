import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  AgchainAdminGuard,
  BlockdataAdminGuard,
  SuperuserGuard,
  SuperuserOnlyGuard,
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
        <Route path="/app/superuser/*" element={<SuperuserGuard />}>
          <Route index element={<div data-testid="protected-surface">unified admin</div>} />
          <Route path="bd/*" element={<BlockdataAdminGuard />}>
            <Route path="*" element={<div data-testid="protected-surface">bd admin</div>} />
          </Route>
          <Route path="ac/*" element={<AgchainAdminGuard />}>
            <Route path="*" element={<div data-testid="protected-surface">ac admin</div>} />
          </Route>
          <Route path="ops/*" element={<SuperuserOnlyGuard />}>
            <Route path="*" element={<div data-testid="protected-surface">superuser only</div>} />
          </Route>
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

    renderGuard('/app/superuser');

    expect(screen.getByText(/verifying access/i)).toBeInTheDocument();
  });

  it('allows a blockdata-only admin into the unified superuser family', () => {
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

    renderGuard('/app/superuser');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('unified admin');
  });

  it('allows a blockdata-only admin into the BD surface', () => {
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

    renderGuard('/app/superuser/bd/parsers-docling');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('bd admin');
  });

  it('lets a superuser into the BD surface', () => {
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

    renderGuard('/app/superuser/bd/parsers-docling');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('bd admin');
  });

  it('allows an agchain-only admin into the AC surface', () => {
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

    renderGuard('/app/superuser/ac/models');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('ac admin');
  });

  it('does not let a blockdata-only persona into the AC surface', () => {
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

    renderGuard('/app/superuser/ac/models');

    expect(screen.getByTestId('app-home')).toBeInTheDocument();
  });

  it('allows a superuser-only persona into superuser-only surfaces', () => {
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

    renderGuard('/app/superuser/ops/runtime');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('superuser only');
  });

  it('does not let an agchain-only persona into superuser-only surfaces', () => {
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

    renderGuard('/app/superuser/ops/runtime');

    expect(screen.getByTestId('app-home')).toBeInTheDocument();
  });

  it('does not keep showing verification after the access probe has failed', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: null,
      status: 'error',
      error: 'network down',
      refresh: vi.fn(),
    });

    renderGuard('/app/superuser/ops/runtime');

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

    renderGuard('/app/superuser/bd/parsers-docling');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('bd admin');
  });
});
