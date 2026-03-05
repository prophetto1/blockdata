import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ServiceDetailPage from './ServiceDetailPage';
import type { ServiceFunctionRow, ServiceRow } from '@/pages/settings/services-panel.types';

const navigateMock = vi.fn();
const fromMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ serviceId: 'service-1' }),
  };
});

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

const serviceRow: ServiceRow = {
  service_id: 'service-1',
  service_type: 'slack',
  service_name: 'slack',
  base_url: 'https://hooks.slack.com',
  health_status: 'online',
  last_heartbeat: null,
  enabled: true,
  config: null,
  description: 'Slack notifications',
  auth_type: 'none',
  auth_config: {},
  docs_url: null,
  created_at: '2026-03-05T00:00:00.000Z',
  updated_at: '2026-03-05T00:00:00.000Z',
};

const functionRow: ServiceFunctionRow = {
  function_id: 'fn-1',
  service_id: 'service-1',
  function_name: 'slack_execution',
  function_type: 'utility',
  label: 'Send Execution Status',
  description: 'Send execution status to Slack.',
  long_description: 'Detailed docs content.',
  entrypoint: '/slack_execution',
  http_method: 'POST',
  content_type: 'application/json',
  parameter_schema: [
    {
      name: 'url',
      type: 'string',
      required: true,
      description: 'Slack webhook URL',
    },
  ],
  result_schema: null,
  enabled: true,
  tags: ['slack', 'notification'],
  auth_type: null,
  auth_config: null,
  request_example: null,
  response_example: null,
  examples: [
    {
      title: 'Alert on failed execution',
      lang: 'yaml',
      code: 'type: io.kestra.plugin.slack.SlackExecution\nurl: "{{ secret(\'SLACK_WEBHOOK\') }}"',
    },
  ],
  metrics: [
    {
      name: 'duration_ms',
      type: 'histogram',
      description: 'Execution duration in milliseconds',
    },
  ],
  when_to_use: 'Use when execution status alerts are needed.',
  provider_docs_url: null,
  deprecated: false,
  beta: false,
  source_task_class: 'io.kestra.plugin.slack.SlackExecution',
  plugin_group: 'io.kestra.plugin.slack',
  created_at: '2026-03-05T00:00:00.000Z',
  updated_at: '2026-03-05T00:00:00.000Z',
};

function buildServiceQueryResult() {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        ...serviceRow,
      },
      error: null,
    }),
  };

  return builder;
}

function buildFunctionQueryResult() {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [functionRow],
      error: null,
    }),
  };

  return builder;
}

describe('ServiceDetailPage function docs rendering', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    navigateMock.mockReset();
    fromMock.mockReset();

    fromMock.mockImplementation((table: string) => {
      if (table === 'registry_services') {
        return buildServiceQueryResult();
      }

      if (table === 'registry_service_functions') {
        return buildFunctionQueryResult();
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('renders examples as documentation blocks with per-example copy actions', async () => {
    render(<ServiceDetailPage />);

    await screen.findByText('slack_execution');

    expect(await screen.findByText('Alert on failed execution')).toBeInTheDocument();
    expect(screen.getByTitle('Copy example code')).toBeInTheDocument();
  });

  it('renders metrics as a structured table instead of raw JSON', async () => {
    render(<ServiceDetailPage />);

    await screen.findByText('slack_execution');

    expect(await screen.findByRole('columnheader', { name: 'Metric' })).toBeInTheDocument();
    expect(screen.getByText('duration_ms')).toBeInTheDocument();
    expect(screen.getByText('histogram')).toBeInTheDocument();
    expect(screen.getByText('Execution duration in milliseconds')).toBeInTheDocument();
  });

  it('renders function search and type filter controls in the left rail', async () => {
    render(<ServiceDetailPage />);

    expect(await screen.findByLabelText('Search Functions')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All types (1)' })).toBeInTheDocument();
  });
});
