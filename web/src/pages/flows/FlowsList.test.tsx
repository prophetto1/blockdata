import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import FlowsList from '@/pages/FlowsList';
import { loadFlowsList } from '@/pages/flows/flows.api';

vi.mock('@/pages/flows/flows.api', () => ({
  loadFlowsList: vi.fn(),
  formatLabelBadge: ({ key, value }: { key: string; value: string }) => (value ? `${key}:${value}` : key),
}));

vi.mock('@/components/common/PageHeader', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <span>{title}</span>
      {subtitle ? <span>{subtitle}</span> : null}
    </div>
  ),
}));

const loadFlowsListMock = vi.mocked(loadFlowsList);

describe('FlowsList', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
  });

  beforeEach(() => {
    loadFlowsListMock.mockReset();
    loadFlowsListMock.mockResolvedValue({
      total: 1,
      results: [
        {
          routeId: 'company.business/business-automation',
          flowId: 'business-automation',
          namespace: 'company.business',
          labels: [{ key: 'team', value: 'operations' }],
          lastExecutionDate: '2026-03-07T12:00:00.000Z',
          lastExecutionStatus: 'SUCCESS',
          executionStatistics: '3 runs',
          revision: 3,
          updatedAt: '2026-03-07T12:00:00.000Z',
          description: 'Business automation flow',
          disabled: false,
          triggerCount: 2,
        },
      ],
    });
  });

  it('renders the shared page header and the flows list inside a card-style table surface', async () => {
    render(
      <MemoryRouter>
        <FlowsList />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByText('Flows')).toBeInTheDocument();
    expect(await screen.findByText('business-automation')).toBeInTheDocument();
    expect(screen.getByText('company.business')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Source search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add filters' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search flows')).toBeInTheDocument();
    expect(screen.getByText('Labels')).toBeInTheDocument();
    expect(screen.getByText('Last execution date')).toBeInTheDocument();
    expect(screen.getByText('Last execution status')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
  });

  it('shows the empty-state row when the API returns no flows', async () => {
    loadFlowsListMock.mockResolvedValue({
      total: 0,
      results: [],
    });

    render(
      <MemoryRouter>
        <FlowsList />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No flows found.')).toBeInTheDocument();
  });

  it('keeps the shared toolbar controls visible while loading an empty result', async () => {
    loadFlowsListMock.mockResolvedValue({
      total: 0,
      results: [],
    });

    render(
      <MemoryRouter>
        <FlowsList />
      </MemoryRouter>,
    );

    expect(await screen.findByPlaceholderText('Search flows')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page display settings' })).toBeInTheDocument();
  });

  it('surfaces API errors without dropping the shared page header contract', async () => {
    loadFlowsListMock.mockRejectedValue(new Error('Kestra API error: 500 Internal Server Error'));

    render(
      <MemoryRouter>
        <FlowsList />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Kestra API error: 500 Internal Server Error')).toBeInTheDocument();
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });
});
