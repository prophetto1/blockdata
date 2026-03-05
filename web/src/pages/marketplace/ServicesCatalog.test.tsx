import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ServicesCatalog from './ServicesCatalog';

const fromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('@/components/common/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => (
    <div data-testid="page-header">{title}</div>
  ),
}));

function buildServicesQueryResult() {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        {
          service_id: 'service-1',
          service_type: 'notification',
          service_name: 'Slack',
          description: 'Send notifications to Slack channels.',
          docs_url: 'https://docs.slack.dev',
          health_status: 'online',
        },
      ],
      error: null,
    }),
  };

  return builder;
}

function buildFunctionsQueryResult() {
  const builder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        {
          function_id: 'fn-1',
          service_id: 'service-1',
          function_name: 'slack_execution',
          function_type: 'utility',
          label: 'Send Execution Status',
          description: 'Notify when a run completes.',
          tags: ['alerts'],
          beta: false,
          deprecated: false,
        },
      ],
      error: null,
    }),
  };

  return builder;
}

describe('ServicesCatalog', () => {
  beforeEach(() => {
    fromMock.mockReset();
    fromMock.mockImplementation((table: string) => {
      if (table === 'registry_services') {
        return buildServicesQueryResult();
      }

      if (table === 'registry_service_functions') {
        return buildFunctionsQueryResult();
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('renders service cards with visible health context and a detail call to action', async () => {
    render(
      <MemoryRouter>
        <ServicesCatalog />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('Health: online')).toBeInTheDocument();
    expect(screen.getByText('View details')).toBeInTheDocument();
    expect(screen.getAllByText('Notifications').length).toBeGreaterThan(0);
  });
});
