import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainHooksPage from './AgchainHooksPage';
import AgchainInstructionsPage from './AgchainInstructionsPage';
import AgchainLogsPage from './AgchainLogsPage';
import AgchainMcpPage from './AgchainMcpPage';
import AgchainMemoryPage from './AgchainMemoryPage';
import AgchainMetricsPage from './AgchainMetricsPage';
import AgchainEvalModelsPage from './AgchainEvalModelsPage';
import AgchainPlaygroundPage from './AgchainPlaygroundPage';
import AgchainSandboxPage from './AgchainSandboxPage';
import AgchainSkillsPage from './AgchainSkillsPage';
import AgchainStoragePage from './AgchainStoragePage';
import AgchainTasksPage from './AgchainTasksPage';
import AgchainTracePage from './AgchainTracePage';

const useAgchainScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AGChain new taxonomy placeholder pages', () => {
  beforeEach(() => {
    useAgchainScopeStateMock.mockReset();
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'ready',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
      focusedProject: {
        benchmark_id: 'benchmark-1',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        project_id: 'project-1',
        project_slug: 'legal-10',
        project_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
    });
  });

  it('renders honest placeholder shells for the new project, eval, monitor, and harness taxonomy pages', () => {
    const cases = [
      { Component: AgchainPlaygroundPage, title: 'Playground' },
      { Component: AgchainSandboxPage, title: 'Sandbox' },
      { Component: AgchainTasksPage, title: 'Tasks' },
      { Component: AgchainEvalModelsPage, title: 'Models' },
      { Component: AgchainMetricsPage, title: 'Metrics' },
      { Component: AgchainLogsPage, title: 'Logs' },
      { Component: AgchainTracePage, title: 'Trace' },
      { Component: AgchainInstructionsPage, title: 'Instructions' },
      { Component: AgchainSkillsPage, title: 'Skills' },
      { Component: AgchainMcpPage, title: 'MCP' },
      { Component: AgchainStoragePage, title: 'Storage' },
      { Component: AgchainMemoryPage, title: 'Memory' },
      { Component: AgchainHooksPage, title: 'Hooks' },
    ] as const;

    const { rerender } = render(
      <MemoryRouter>
        <AgchainPlaygroundPage />
      </MemoryRouter>,
    );

    for (const { Component, title } of cases) {
      rerender(
        <MemoryRouter>
          <Component />
        </MemoryRouter>,
      );

      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
    }
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-project',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
    });

    render(
      <MemoryRouter>
        <AgchainPlaygroundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
