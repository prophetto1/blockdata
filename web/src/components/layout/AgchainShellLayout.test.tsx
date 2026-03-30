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

vi.mock('@/components/agchain/AgchainProjectSwitcher', () => ({
  AgchainProjectSwitcher: () => <div data-testid="agchain-project-context">Focused AGChain project</div>,
}));

afterEach(() => {
  cleanup();
});

describe('AgchainShellLayout', () => {
  it('renders primary rail and outlet on overview-first routes', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('agchain-secondary-rail')).not.toBeInTheDocument();
    expect(screen.getByTestId('agchain-primary-rail-content')).toHaveTextContent('BlockDataBench');
    expect(screen.getByTestId('agchain-project-context')).toHaveTextContent('Focused AGChain project');
    expect(screen.queryByTestId('project-switcher')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/search/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /workspace selector/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle color scheme/i })).toBeInTheDocument();
    expect(screen.getByTestId('agchain-shell-top-divider')).toBeInTheDocument();
    expect(screen.getByTestId('agchain-route-content')).toBeInTheDocument();
  });

  it('renders the benchmark secondary rail only on the hidden benchmark-definition route', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/settings/project/benchmark-definition']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toBeInTheDocument();
    const rail2 = screen.getByTestId('agchain-secondary-rail');
    expect(rail2).toBeInTheDocument();
    expect(rail2).toHaveStyle({ top: '60px', bottom: '0px' });
    expect(screen.getByTestId('agchain-route-content')).toBeInTheDocument();
  });

  it('does not render secondary rail on compatibility benchmark routes before redirect handling', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks/legal-10']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('agchain-secondary-rail')).not.toBeInTheDocument();
  });

  it('does not render secondary rail on models route', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/models']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('agchain-secondary-rail')).not.toBeInTheDocument();
  });
});
