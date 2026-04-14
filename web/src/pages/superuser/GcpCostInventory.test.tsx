import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const platformApiFetchMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/components/superuser/GcpCostInventoryGrid', () => ({
  GcpCostInventoryGrid: ({
    rows,
    loading,
    truncated,
    errorMessage,
  }: {
    rows: Array<{ service: string }>;
    loading: boolean;
    truncated: boolean;
    errorMessage?: string | null;
  }) => (
    <div data-testid="gcp-cost-grid-mock">
      <span>{loading ? 'loading' : 'ready'}</span>
      <span>{rows.length}</span>
      <span>{String(truncated)}</span>
      <span>{errorMessage ?? ''}</span>
      {rows.map((row) => (
        <div key={row.service}>{row.service}</div>
      ))}
    </div>
  ),
}));

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

async function importPage() {
  return import('./GcpCostInventory');
}

describe('GcpCostInventory', () => {
  beforeEach(() => {
    vi.resetModules();
    platformApiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads summary and rows into the grid surface', { timeout: 15000 }, async () => {
    platformApiFetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          provider: 'gcp',
          configured: true,
          source_table_fqn: 'billing-prj.finops.billing_export',
          invoice_month: '202604',
          currency: 'USD',
          total_cost: 654.32,
          row_count: 2,
          truncated: false,
          available_filters: {
            billing_accounts: [{ id: 'ABC-123', label: 'ABC-123' }],
            service_categories: ['Compute'],
            services: ['Compute Engine'],
          },
          generated_at: '2026-04-12T10:00:00Z',
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          provider: 'gcp',
          invoice_month: '202604',
          truncated: false,
          row_count: 1,
          rows: [
            {
              billing_account_id: 'ABC-123',
              service_category: 'Compute',
              service: 'Compute Engine',
              sku: 'N2 Core',
              project_id: 'demo-project',
              project_name: 'Demo Project',
              resource_name: 'vm-1',
              resource_global_name: '//compute.googleapis.com/projects/demo/zones/us-central1-a/instances/vm-1',
              location: 'us-central1-a',
              usage_amount: 12.5,
              usage_unit: 'h',
              cost: 98.12,
              currency: 'USD',
              last_usage_at: '2026-04-11T23:00:00Z',
            },
          ],
          generated_at: '2026-04-12T10:00:00Z',
        }),
      );

    const { Component } = await importPage();
    render(<Component />);

    await waitFor(() => {
      expect(screen.getByTestId('gcp-cost-grid-mock')).toHaveTextContent('Compute Engine');
    });
    expect(screen.queryByText('GCP Cost Inventory')).not.toBeInTheDocument();
    expect(screen.getByText('2026-04')).toBeInTheDocument();
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(1, '/admin/cloud-costs/gcp/summary');
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/admin/cloud-costs/gcp/items?invoice_month=202604',
    );
  });

  it('shows the configuration-missing state from summary without loading items', async () => {
    platformApiFetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        provider: 'gcp',
        configured: false,
        source_table_fqn: null,
        invoice_month: '',
        currency: null,
        total_cost: 0,
        row_count: 0,
        truncated: false,
        available_filters: {
          billing_accounts: [],
          service_categories: [],
          services: [],
        },
        generated_at: '2026-04-12T10:00:00Z',
        error: 'GCP billing export is not configured.',
      }),
    );

    const { Component } = await importPage();
    render(<Component />);

    expect(await screen.findByTestId('gcp-cost-config-missing')).toBeInTheDocument();
    expect(screen.queryByText(/read the normalized bigquery billing export through platform-api/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Cloud Billing export is not connected for this local platform-api environment.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /enable cloud billing export to bigquery in google cloud console/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('GCP billing export is not configured.')).not.toBeInTheDocument();
    expect(platformApiFetchMock.mock.calls[0]?.[0]).toBe('/admin/cloud-costs/gcp/summary');
    expect(
      platformApiFetchMock.mock.calls.some((call) =>
        String(call[0]).startsWith('/admin/cloud-costs/gcp/items'),
      ),
    ).toBe(false);
  });

  it('shows an actionable recovery message when the backend route returns 404', async () => {
    platformApiFetchMock.mockResolvedValueOnce(
      mockJsonResponse({ detail: 'Not Found' }, false, 404),
    );

    const { Component } = await importPage();
    render(<Component />);

    expect(
      await screen.findByText(
        /running platform-api process does not have the gcp cost inventory routes loaded/i,
      ),
    ).toBeInTheDocument();
  });

  it('applies filters and refetches summary and items', async () => {
    platformApiFetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          provider: 'gcp',
          configured: true,
          source_table_fqn: 'billing-prj.finops.billing_export',
          invoice_month: '202604',
          currency: 'USD',
          total_cost: 654.32,
          row_count: 2,
          truncated: false,
          available_filters: {
            billing_accounts: [{ id: 'ABC-123', label: 'ABC-123' }],
            service_categories: ['Compute'],
            services: ['Compute Engine'],
          },
          generated_at: '2026-04-12T10:00:00Z',
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          provider: 'gcp',
          invoice_month: '202604',
          truncated: false,
          row_count: 1,
          rows: [],
          generated_at: '2026-04-12T10:00:00Z',
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          provider: 'gcp',
          configured: true,
          source_table_fqn: 'billing-prj.finops.billing_export',
          invoice_month: '202603',
          currency: 'USD',
          total_cost: 321.0,
          row_count: 1,
          truncated: false,
          available_filters: {
            billing_accounts: [{ id: 'ABC-123', label: 'ABC-123' }],
            service_categories: ['Compute'],
            services: ['Compute Engine'],
          },
          generated_at: '2026-04-12T10:00:00Z',
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          provider: 'gcp',
          invoice_month: '202603',
          truncated: true,
          row_count: 1001,
          rows: [
            {
              billing_account_id: 'ABC-123',
              service_category: 'Compute',
              service: 'Compute Engine',
              sku: 'N2 Core',
              project_id: 'demo-project',
              project_name: 'Demo Project',
              resource_name: 'vm-2',
              resource_global_name: null,
              location: 'us-central1-a',
              usage_amount: 8,
              usage_unit: 'h',
              cost: 44.01,
              currency: 'USD',
              last_usage_at: '2026-03-31T23:00:00Z',
            },
          ],
          generated_at: '2026-04-12T10:00:00Z',
        }),
      );

    const { Component } = await importPage();
    render(<Component />);

    await screen.findByText('Rows');

    fireEvent.change(screen.getByPlaceholderText('YYYYMM'), {
      target: { value: '202603' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenNthCalledWith(
        3,
        '/admin/cloud-costs/gcp/summary?invoice_month=202603',
      );
      expect(platformApiFetchMock).toHaveBeenNthCalledWith(
        4,
        '/admin/cloud-costs/gcp/items?invoice_month=202603',
      );
    });
    expect(await screen.findByTestId('gcp-cost-grid-mock')).toHaveTextContent('Compute Engine');
  });

  it('registers the superuser nav item and router path', async () => {
    const fs = await import('node:fs/promises');
    const { SUPERUSER_NAV_SECTIONS } = await import('@/components/admin/AdminLeftNav');
    const routerSource = await fs.readFile('src/router.tsx', 'utf8');

    expect(
      SUPERUSER_NAV_SECTIONS.flatMap((section) => section.items).some(
        (item) => item.path === '/app/superuser/gcp-cost-inventory',
      ),
    ).toBe(true);
    expect(routerSource.includes("{ path: 'gcp-cost-inventory'")).toBe(true);
  });
});
