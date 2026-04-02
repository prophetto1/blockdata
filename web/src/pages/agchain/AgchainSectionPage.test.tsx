import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgchainWorkspaceProvider } from '@/contexts/AgchainWorkspaceContext';
import { AgchainSectionPage } from './AgchainSectionPage';

vi.mock('@/lib/agchainWorkspaces', () => ({
  fetchAgchainOrganizations: () => Promise.resolve({
    items: [{ organization_id: 'org-1', organization_slug: 'personal', display_name: 'Personal', membership_role: 'organization_admin', is_personal: true, project_count: 1 }],
  }),
  fetchAgchainProjects: () => Promise.resolve({
    items: [{ project_id: 'project-1', organization_id: 'org-1', project_slug: 'test', project_name: 'Test Project', description: '', membership_role: 'project_admin', updated_at: null, primary_benchmark_slug: null, primary_benchmark_name: null }],
  }),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainSectionPage', () => {
  it('uses the shared AG chain page frame aligned to the shell content inset', async () => {
    render(
      <AgchainWorkspaceProvider>
        <AgchainSectionPage
          title="Runs"
          description="Run setup lives here."
          bullets={['First bullet', 'Second bullet']}
        />
      </AgchainWorkspaceProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Project-scoped placeholder surface')).toBeInTheDocument();
    });

    const frame = screen.getByTestId('agchain-page-frame');
    expect(frame).toHaveClass('w-full', 'px-4');
    expect(frame.className).not.toContain('max-w-');
    expect(frame.className).not.toContain('mx-auto');
  });
});
