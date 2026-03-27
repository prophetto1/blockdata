import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Component as SuperuserWorkspace } from './SuperuserWorkspace';
import { platformApiFetch } from '@/lib/platformApi';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: vi.fn(),
}));

vi.mock('@/components/workbench/Workbench', () => ({
  Workbench: ({
    defaultPanes,
    renderContent,
  }: {
    defaultPanes: Array<{ id: string; activeTab: string }>;
    renderContent: (tabId: string) => React.ReactNode;
  }) => (
    <div>
      {defaultPanes.map((pane) => (
        <section key={pane.id}>{renderContent(pane.activeTab)}</section>
      ))}
    </div>
  ),
}));

const platformApiFetchMock = vi.mocked(platformApiFetch);

describe('SuperuserWorkspace storage panels', () => {
  it('renders the storage policy panel and provisioning monitor', async () => {
    platformApiFetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        default_new_user_quota_bytes: 5 * 1024 * 1024 * 1024,
        updated_at: '2026-03-21T18:25:00Z',
        updated_by: 'admin-user',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          {
            user_id: 'user-1',
            email: 'new-user@example.com',
            created_at: '2026-03-21T18:20:00Z',
            has_auth_user: true,
            has_default_project: true,
            default_project_id: 'project-1',
            has_storage_quota: true,
            quota_bytes: 5 * 1024 * 1024 * 1024,
            used_bytes: 0,
            reserved_bytes: 0,
            status: 'ok',
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    render(<SuperuserWorkspace />);

    expect(await screen.findByText(/default new-user quota/i)).toBeInTheDocument();
    expect(screen.getByText(/recent signup provisioning/i)).toBeInTheDocument();
    expect(screen.getByText(/new-user@example.com/i)).toBeInTheDocument();
  });
});
