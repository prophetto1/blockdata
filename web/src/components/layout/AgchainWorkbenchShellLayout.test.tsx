import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AgchainWorkbenchShellLayout } from './AgchainWorkbenchShellLayout';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/contexts/AgchainWorkspaceContext', () => ({
  AgchainWorkspaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/agchain/AgchainWorkbenchRail', () => ({
  AgchainWorkbenchRail: () => <div data-testid="agchain-workbench-rail-content">Workbench Rail</div>,
}));

afterEach(() => {
  cleanup();
});

describe('AgchainWorkbenchShellLayout', () => {
  it('renders the dedicated workbench rail and outlet for designer routes', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/eval-designer']}>
        <Routes>
          <Route element={<AgchainWorkbenchShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-workbench-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-workbench-rail')).toBeInTheDocument();
    expect(screen.getByTestId('agchain-workbench-rail-content')).toBeInTheDocument();
    expect(screen.getByTestId('agchain-workbench-frame')).toBeInTheDocument();
    expect(screen.getByTestId('agchain-workbench-route-content')).toBeInTheDocument();
  });
});
