import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ShellWorkspaceSelector } from './ShellWorkspaceSelector';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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
});

describe('ShellWorkspaceSelector', () => {
  it('shows Blockdata as checked on standard app routes', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('radio', { name: /blockdata/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /ag chain/i })).not.toBeChecked();
  });

  it('shows AG chain as checked on agchain routes', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/runs']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('radio', { name: /ag chain/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /blockdata/i })).not.toBeChecked();
  });

  it('navigates to agchain when AG chain segment is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('radio', { name: /ag chain/i }));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/agchain');
    });
  });

  it('navigates to blockdata when Blockdata segment is clicked from agchain', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('radio', { name: /blockdata/i }));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app');
    });
  });
});