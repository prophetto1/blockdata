import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FlowDetail from './FlowDetail';

const { fromMock, navigateMock, useShellHeaderTitleMock } = vi.hoisted(() => {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { project_name: 'Default Project', workspace_id: 'default' },
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    fromMock: from,
    navigateMock: vi.fn(),
    useShellHeaderTitleMock: vi.fn(),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ flowId: 'flow-1', tab: 'overview' }),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: useShellHeaderTitleMock,
}));

describe('FlowDetail page', () => {
  it('renders flow tabs and pushes breadcrumb/title metadata to shell header', async () => {
    render(
      <FlowDetail />,
    );

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(useShellHeaderTitleMock).toHaveBeenLastCalledWith({
        title: 'Default Project',
        subtitle: 'Flows/Default Project/Overview',
      });
    });

    const overviewTab = screen.getByRole('tab', { name: /overview/i });
    expect(overviewTab).toBeInTheDocument();
    expect(overviewTab.className).toContain('border-t-[color:var(--flow-accent)]');
    expect(overviewTab.className).not.toMatch(/sky-/);
    expect(screen.getByRole('tab', { name: /concurrency/i })).toBeInTheDocument();
  });
});
