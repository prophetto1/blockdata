import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
});

describe('ShellWorkspaceSelector', () => {
  it('shows Blockdata as the selected workspace on standard app routes', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace blockdata/i })).toBeInTheDocument();
  });

  it('shows AG chain as the selected workspace on agchain routes', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/runs']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace ag chain/i })).toBeInTheDocument();
  });
});
