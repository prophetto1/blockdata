import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ShellWorkspaceSelector } from './ShellWorkspaceSelector';

const navigateMock = vi.fn();
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/hooks/useAdminSurfaceAccess', () => ({
  useAdminSurfaceAccessState: () => useAdminSurfaceAccessStateMock(),
}));

beforeEach(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
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

describe('ShellWorkspaceSelector', () => {
  it('shows Blockdata as the selected workspace on standard app routes', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('Blockdata');
  });

  it('shows AG chain as the selected workspace on agchain routes', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/runs']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('AG chain');
  });

  it('navigates to agchain when AG chain is selected', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /ag chain/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/agchain');
    });
  });

  it('navigates to blockdata when Blockdata is selected from agchain', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /blockdata/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app');
    });
  });

  it('hides the elevated admin surfaces when the probe is not authorized', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /superuser/i })).not.toBeInTheDocument();
  });

  it('shows the three elevated admin surfaces when the probe is authorized', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: true,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /blockdata admin/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /agchain admin/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /superuser/i })).toBeInTheDocument();
  });

  it('shows only Blockdata Admin for a blockdata-only admin persona', async () => {
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

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /blockdata admin/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^superuser$/i })).not.toBeInTheDocument();
  });

  it('shows only AGChain Admin for an agchain-only admin persona', async () => {
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

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /agchain admin/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^superuser$/i })).not.toBeInTheDocument();
  });

  it('shows only Superuser for a superuser-only persona', async () => {
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

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /^superuser$/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
  });

  it('falls back to a visible workspace when the current admin route is forbidden', () => {
    render(
      <MemoryRouter initialEntries={['/app/blockdata-admin/parsers-docling']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('Blockdata');

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^superuser$/i })).not.toBeInTheDocument();
  });

  it('navigates to the blockdata admin shell when Blockdata Admin is selected', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: true,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /blockdata admin/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/blockdata-admin/parsers-docling');
    });
  });

  it('navigates to the agchain admin shell when AGChain Admin is selected', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: true,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /agchain admin/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/agchain-admin');
    });
  });

  it('navigates to the superuser shell when Superuser is selected', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: true,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /^superuser$/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/superuser');
    });
  });
});
