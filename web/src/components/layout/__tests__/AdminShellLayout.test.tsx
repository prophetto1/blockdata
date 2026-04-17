import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { AdminShellLayout } from '../AdminShellLayout';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'jon@example.com' },
    profile: null,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: () => <div data-testid="mock-platform-rail-content">platform rail</div>,
}));

vi.mock('@/hooks/useAdminSurfaceAccess', () => ({
  useAdminSurfaceAccessState: () => ({
    access: {
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
    },
    status: 'ready',
    error: null,
    refresh: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function renderWithRouter(path = '/app/superuser') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/superuser/*" element={<AdminShellLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
          <Route path="*" element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminShellLayout', () => {
  it('renders the top band, platform rail, and main area on the index route', () => {
    renderWithRouter();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('admin-shell-top-band')).toBeInTheDocument();
    expect(screen.getByTestId('admin-platform-rail')).toBeInTheDocument();
  });

  it('keeps the open-state rail toggle in the top band while the title stays to the right of the primary rail', () => {
    renderWithRouter('/app/superuser');

    const toggle = screen.getByRole('button', { name: 'Hide admin navigation' });
    expect(screen.getByTestId('admin-shell-top-band')).toContainElement(toggle);
    expect(screen.getByTestId('admin-platform-rail')).not.toContainElement(toggle);
    expect(toggle).toHaveStyle({
      insetInlineStart: '204px',
      top: '50%',
      transform: 'translateY(-50%)',
    });
    expect(screen.getByTestId('admin-shell-top-band-content')).toHaveStyle({
      marginInlineStart: '248px',
    });
  });

  it('renders the superuser tabs in the center of the top band', () => {
    renderWithRouter('/app/superuser');

    const centerSlot = screen.getByTestId('admin-shell-top-band-center');
    expect(centerSlot).toBeInTheDocument();
    expect(centerSlot).toContainElement(screen.getByRole('tab', { name: /^superuser$/i }));
    expect(screen.getByRole('tab', { name: /^bd$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^ac$/i })).toBeInTheDocument();
    expect(screen.getByTestId('admin-shell-frame')).not.toContainElement(screen.getByRole('tablist'));
  });

  it('renders the exact Superuser breadcrumb from the primary rail label', () => {
    renderWithRouter('/app/superuser/plan-tracker');
    expect(screen.getByTestId('admin-shell-breadcrumb')).toHaveTextContent('Superuser / Plan Tracker');
  });

  it('renders the BD breadcrumb from the unified superuser shell label', () => {
    renderWithRouter('/app/superuser/bd/model-roles');
    expect(screen.getByTestId('admin-shell-breadcrumb')).toHaveTextContent('Superuser / Model Roles');
  });

  it('renders the AC breadcrumb from the unified superuser shell label', () => {
    renderWithRouter('/app/superuser/ac/models');
    expect(screen.getByTestId('admin-shell-breadcrumb')).toHaveTextContent('Superuser / Models');
  });

  it('does not render the secondary rail on routes without secondary nav', () => {
    renderWithRouter('/app/superuser/operational-readiness');
    expect(screen.queryByTestId('admin-secondary-rail')).not.toBeInTheDocument();
  });

  it('does not render the secondary rail on BD routes after the config menus were removed', () => {
    renderWithRouter('/app/superuser/bd/parsers-docling');
    expect(screen.queryByTestId('admin-secondary-rail')).not.toBeInTheDocument();
  });

  it('hides the full left-side chrome stack while keeping the top band visible', () => {
    renderWithRouter('/app/superuser/bd/parsers-docling');

    fireEvent.click(screen.getByRole('button', { name: 'Hide admin navigation' }));

    expect(screen.getByTestId('admin-shell-top-band')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show admin navigation' })).toHaveStyle({
      insetInlineStart: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
    });
    expect(screen.queryByTestId('admin-platform-rail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-secondary-rail')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-shell-frame')).toBeInTheDocument();
  });

  it('restores the admin chrome stack when the top-band toggle is pressed again', () => {
    renderWithRouter('/app/superuser/bd/parsers-docling');

    fireEvent.click(screen.getByRole('button', { name: 'Hide admin navigation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show admin navigation' }));

    expect(screen.getByTestId('admin-shell-top-band')).toBeInTheDocument();
    expect(screen.getByTestId('admin-platform-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-secondary-rail')).not.toBeInTheDocument();
  });

  it('renders the outlet inside the admin workspace frame', () => {
    renderWithRouter();
    expect(screen.getByTestId('admin-shell-frame')).toBeInTheDocument();
  });

  it('renders the outlet child', () => {
    renderWithRouter();
    expect(screen.getByTestId('outlet-child')).toBeInTheDocument();
  });
});
