import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainSettingsPage from './AgchainSettingsPage';

const useAgchainProjectFocusMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainSettingsPage', () => {
  beforeEach(() => {
    useAgchainProjectFocusMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: {
        project_id: 'project-1',
        project_slug: 'legal-evals',
        project_name: 'Legal Evals',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
      loading: false,
    });
  });

  it('renders the settings landing with project, organization, and personal partitions', () => {
    render(
      <MemoryRouter>
        <AgchainSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText(/legal evals owns this settings surface/i)).toBeInTheDocument();
    expect(screen.getByText('Project settings')).toBeInTheDocument();
    expect(screen.getByText('Organization settings')).toBeInTheDocument();
    expect(screen.getByText('Personal settings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open benchmark definition' })).toHaveAttribute(
      'href',
      '/app/agchain/settings/project/benchmark-definition',
    );
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: null,
      loading: false,
    });

    render(
      <MemoryRouter>
        <AgchainSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
