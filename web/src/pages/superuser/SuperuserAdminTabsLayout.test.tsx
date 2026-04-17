import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SuperuserAdminTabsLayout } from './SuperuserAdminTabsLayout';

const useAdminSurfaceAccessStateMock = vi.fn(() => ({
  access: {
    blockdataAdmin: true,
    agchainAdmin: true,
    superuser: true,
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
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
    },
    status: 'ready',
    error: null,
    refresh: vi.fn(),
  });
});

describe('SuperuserAdminTabsLayout', () => {
  it('renders fixed-width route-backed tabs for Superuser, BD, and AC', () => {
    render(
      <MemoryRouter initialEntries={['/app/superuser']}>
        <SuperuserAdminTabsLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('tab', { name: /^superuser$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^bd$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^ac$/i })).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toHaveClass('grid-cols-3');
    expect(screen.getByRole('tab', { name: /^superuser$/i })).toHaveClass('w-full');
    expect(screen.getByRole('tab', { name: /^bd$/i })).toHaveClass('w-full');
    expect(screen.getByRole('tab', { name: /^ac$/i })).toHaveClass('w-full');
  });
});
