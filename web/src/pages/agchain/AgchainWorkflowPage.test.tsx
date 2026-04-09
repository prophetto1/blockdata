import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainWorkflowPage from './AgchainWorkflowPage';

const useAgchainScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

vi.mock('@/components/flows/FlowCanvas', () => ({
  default: () => <div data-testid="flow-canvas-stub" />,
}));

describe('AgchainWorkflowPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useAgchainScopeStateMock.mockReset();
  });

  it('mounts the migrated workflow editor inside the AGChain page frame when a project is focused', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'ready',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
      focusedProject: {
        project_id: 'project-1',
        project_slug: 'legal-10',
        project_name: 'Legal-10',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
    });

    render(
      <MemoryRouter>
        <AgchainWorkflowPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Workflow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Object' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Skill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Prompt' })).toBeInTheDocument();
    expect(screen.getByTestId('workflow-editor-canvas')).toBeInTheDocument();
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
        <AgchainWorkflowPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
