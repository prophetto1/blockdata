import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AppLayout } from './AppLayout';

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
  LeftRailShadcn: ({ footerContent }: { footerContent?: ReactNode }) => (
    <div data-testid="left-rail">
      {footerContent ? <div data-testid="left-rail-footer-content">{footerContent}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/shell/RightRailShell', () => ({
  RightRailShell: () => <div data-testid="right-rail-shell" />,
}));

vi.mock('@/components/shell/HeaderCenterContext', () => ({
  HeaderCenterProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useHeaderCenter: () => ({ pageHeader: null }),
}));

vi.mock('@/components/shell/RightRailContext', () => ({
  RightRailProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
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
  AppPageShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="app-page-shell">{children}</div>
  ),
}));

vi.mock('@ark-ui/react/drawer', () => ({
  Drawer: {
    Root: ({ children }: { children: ReactNode }) => <>{children}</>,
    Backdrop: () => null,
    Positioner: ({ children }: { children: ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: ReactNode }) => <>{children}</>,
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

vi.mock('@/hooks/useStorageQuota', () => ({
  useStorageQuota: () => ({
    loading: false,
    data: {
      quota_bytes: 5 * 1024 * 1024 * 1024,
      used_bytes: 1 * 1024 * 1024 * 1024,
      reserved_bytes: 0,
    },
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/components/storage/StorageQuotaSummary', () => ({
  StorageQuotaSummary: () => <div>Storage quota card</div>,
}));

afterEach(() => {
  cleanup();
});

function renderAt(pathname: string) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/app/*" element={<div data-testid="route-content" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout assets rail quota', () => {
  it('injects the storage quota card into the left rail on the assets route', () => {
    renderAt('/app/assets');

    expect(screen.getByTestId('left-rail-footer-content')).toBeInTheDocument();
    expect(screen.getByText('Storage quota card')).toBeInTheDocument();
  });

  it('does not inject the storage quota card into the left rail on non-assets routes', () => {
    renderAt('/app/settings');

    expect(screen.queryByTestId('left-rail-footer-content')).not.toBeInTheDocument();
    expect(screen.queryByText('Storage quota card')).not.toBeInTheDocument();
  });
});
