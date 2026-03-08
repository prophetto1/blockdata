import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FlowsList from '@/pages/FlowsList';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';

const fromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('@/components/common/PageHeader', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <span>{title}</span>
      {subtitle ? <span>{subtitle}</span> : null}
    </div>
  ),
}));

function buildFlowSourcesQueryResult() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: [
        {
          flow_source_id: 'flow-source-1',
          project_id: 'project-1',
          flow_id: 'business-automation',
          revision: 3,
          updated_at: '2026-03-07T12:00:00.000Z',
          labels: { team: 'operations' },
        },
      ],
      error: null,
    }),
  };
}

function buildEmptyFlowSourcesQueryResult() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
  };
}

function buildBrokenFlowSourcesQueryResult() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'column flow_sources.updated_at does not exist',
      },
    }),
  };
}

describe('FlowsList', () => {
  beforeEach(() => {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, 'project-1');
    fromMock.mockReset();
    fromMock.mockImplementation((table: string) => {
      if (table === 'flow_sources') {
        return buildFlowSourcesQueryResult();
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('renders real flow rows for the selected project without exposing project identity in the table', async () => {
    render(
      <MemoryRouter>
        <FlowsList />
      </MemoryRouter>,
    );

    expect(await screen.findByText('business-automation')).toBeInTheDocument();
    expect(screen.getByText('Revision 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Source search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add filters' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search flows')).toBeInTheDocument();
    expect(screen.getByText('Labels')).toBeInTheDocument();
    expect(screen.getByText('Last execution date')).toBeInTheDocument();
    expect(screen.getByText('Last execution status')).toBeInTheDocument();
    expect(screen.queryByText('project-1')).not.toBeInTheDocument();
    expect(screen.queryByText('mock')).not.toBeInTheDocument();
  });

  it('adds a default flow entry when the selected project has no saved flows yet', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'flow_sources') {
        return buildEmptyFlowSourcesQueryResult();
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    render(
      <MemoryRouter>
        <FlowsList />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('default')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Revision 1').length).toBeGreaterThan(0);
  });

  it('shows a seeded flow row even before a project is selected so the tabs can be opened', async () => {
    window.localStorage.removeItem(PROJECT_FOCUS_STORAGE_KEY);

    render(
      <MemoryRouter>
        <FlowsList />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('default')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/env:mock/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('READY').length).toBeGreaterThan(0);
    expect(screen.queryByText('Select a project to view its flows.')).not.toBeInTheDocument();
  });

  it('falls back to the seeded flow row when the flow_sources schema is behind the page query', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'flow_sources') {
        return buildBrokenFlowSourcesQueryResult();
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    render(
      <MemoryRouter>
        <FlowsList />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('default')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('READY').length).toBeGreaterThan(0);
    expect(screen.queryByText('column flow_sources.updated_at does not exist')).not.toBeInTheDocument();
  });
});
