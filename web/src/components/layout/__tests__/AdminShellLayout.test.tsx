import { cleanup, render, screen } from '@testing-library/react';
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

vi.mock('@/hooks/useSuperuserProbe', () => ({
  useSuperuserProbe: () => true,
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: () => <div data-testid="mock-platform-rail-content">platform rail</div>,
}));

afterEach(cleanup);

function renderWithRouter(path = '/app/superuser') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/superuser" element={<AdminShellLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
          <Route path="*" element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminShellLayout', () => {
  it('renders the platform rail and main area on the index route', () => {
    renderWithRouter();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('admin-platform-rail')).toBeInTheDocument();
  });

  it('does not render the secondary rail on routes without secondary nav', () => {
    renderWithRouter('/app/superuser/audit');
    expect(screen.queryByTestId('admin-secondary-rail')).not.toBeInTheDocument();
  });

  it('renders the secondary rail on routes with secondary nav', () => {
    renderWithRouter('/app/superuser/instance-config');
    expect(screen.getByTestId('admin-secondary-rail')).toBeInTheDocument();
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
