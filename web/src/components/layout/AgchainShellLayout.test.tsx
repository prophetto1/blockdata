import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AgchainShellLayout } from './AgchainShellLayout';

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: false,
    toggle: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/components/shell/ProjectSwitcher', () => ({
  ProjectSwitcher: () => <div data-testid="project-switcher">Project Switcher</div>,
}));

vi.mock('@/components/shell/ShellWorkspaceSelector', () => ({
  ShellWorkspaceSelector: () => <button type="button">Workspace Selector</button>,
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    profile: { display_name: 'Test User', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: ({ headerBrand }: { headerBrand?: React.ReactNode }) => (
    <div data-testid="agchain-primary-rail-content">
      {headerBrand}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainShellLayout', () => {
  it('renders a dedicated primary rail, secondary rail, and outlet content', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/runs']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toBeInTheDocument();
    expect(screen.getByTestId('agchain-secondary-rail')).toBeInTheDocument();
    expect(screen.getByTestId('agchain-primary-rail-content')).toHaveTextContent('BlockDataBench');
    expect(screen.queryByText(/go to app/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('project-switcher')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/search/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /workspace selector/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle color scheme/i })).toBeInTheDocument();
    expect(screen.getByTestId('agchain-shell-top-divider')).toBeInTheDocument();
    expect(screen.getByTestId('agchain-route-content')).toBeInTheDocument();
  });
});
