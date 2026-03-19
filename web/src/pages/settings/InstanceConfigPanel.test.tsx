import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InstanceConfigPanel } from './InstanceConfigPanel';

const edgeFetchMock = vi.fn();

vi.mock('@/lib/edge', () => ({
  edgeFetch: (...args: unknown[]) => edgeFetchMock(...args),
}));

describe('InstanceConfigPanel', () => {
  it('renders all config sections as stacked content sections', async () => {
    edgeFetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          policies: [
            {
              policy_key: 'jobs.default_timeout',
              value: 300,
              value_type: 'number',
              description: null,
              updated_at: '2026-03-18T00:00:00.000Z',
              updated_by: null,
            },
          ],
        }),
    });

    render(<InstanceConfigPanel />);

    expect(await screen.findByRole('heading', { name: 'Jobs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Workers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Registries' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Observability' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Secret Storage' })).toBeInTheDocument();
  });
});
