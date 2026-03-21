import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from '@/components/layout/AppLayout';
import { FlowsShellLayout } from '@/components/layout/FlowsShellLayout';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    profile: { display_name: 'Test User', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/shell/TopCommandBar', () => ({
  TopCommandBar: () => <div data-testid="top-command-bar" />,
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: () => <div data-testid="left-rail" />,
}));

vi.mock('@/components/shell/RightRailShell', () => ({
  RightRailShell: () => <div data-testid="right-rail-shell" />,
}));

vi.mock('@/components/shell/HeaderCenterContext', () => ({
  HeaderCenterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/shell/RightRailContext', () => ({
  RightRailProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRightRailContext: () => ({
    content: null,
    activeTab: 'help',
    isOpen: false,
    chatDetached: false,
    setActiveTab: vi.fn(),
    setChatDetached: vi.fn(),
    toggle: vi.fn(),
  }),
}));

vi.mock('@/components/shell/AssistantDockHost', () => ({
  AssistantDockHost: () => <div data-testid="assistant-dock-host" />,
}));

vi.mock('@/components/layout/AppPageShell', () => ({
  AppPageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-page-shell">{children}</div>
  ),
}));

vi.mock('@ark-ui/react/drawer', () => ({
  Drawer: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Backdrop: () => null,
    Positioner: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/useDraggable', () => ({
  useDraggable: () => ({
    position: null,
    isDragging: false,
    handleRef: { current: null },
  }),
}));

afterEach(() => {
  cleanup();
});

function renderAt(pathname: string) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/app/flows" element={<div data-testid="flows-table-page" />} />
        </Route>
        <Route path="/app/flows/:namespace/:flowId/:tab" element={<FlowsShellLayout />}>
          <Route index element={<div data-testid="flows-detail-page" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('flows route ownership', () => {
  it('keeps the table route inside AppLayout', () => {
    renderAt('/app/flows');

    expect(screen.getByTestId('left-rail')).toBeInTheDocument();
    expect(screen.getByTestId('flows-table-page')).toBeInTheDocument();
  });

  it('renders detail routes inside the dedicated flows shell instead of AppLayout', () => {
    renderAt('/app/flows/default/demo-flow/overview');

    expect(screen.queryByTestId('left-rail')).not.toBeInTheDocument();
    expect(screen.getByTestId('flows-detail-page')).toBeInTheDocument();
    expect(screen.getByTestId('flows-shell-frame')).toBeInTheDocument();
  });
});
