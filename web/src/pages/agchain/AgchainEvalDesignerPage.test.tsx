import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainEvalDesignerPage from './AgchainEvalDesignerPage';

const useAgchainScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

vi.mock('@/components/flows/FlowCanvas', () => ({
  default: () => <div data-testid="flow-canvas-stub" />,
}));

describe('AgchainEvalDesignerPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useAgchainScopeStateMock.mockReset();
  });

  it('mounts the eval designer surface inside the AGChain page frame when a project is focused', () => {
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
        <AgchainEvalDesignerPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Eval Designer' })).toBeInTheDocument();
    expect(screen.getByText('Legal-10', { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId('eval-designer-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('flow-canvas-stub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New object' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New skill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New prompt' })).toBeInTheDocument();
    expect(screen.queryByText('Canvas Workbench')).not.toBeInTheDocument();
    expect(screen.queryByText(/Shape evaluation objects, reusable skills, and prompt links/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Palette')).not.toBeInTheDocument();
    expect(screen.queryByText('Inspector')).not.toBeInTheDocument();
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
        <AgchainEvalDesignerPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
