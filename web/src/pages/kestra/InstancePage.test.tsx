import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import InstancePage from './InstancePage';

const edgeFetchMock = vi.fn();

vi.mock('@/lib/edge', () => ({
  edgeFetch: (...args: unknown[]) => edgeFetchMock(...args),
}));

describe('InstancePage', () => {
  it('renders the instance config panel instead of the placeholder shell', async () => {
    edgeFetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          policies: [
            {
              policy_key: 'jobs.default_timeout',
              value: 600,
              value_type: 'number',
              description: null,
              updated_at: '2026-03-06T00:00:00.000Z',
              updated_by: null,
            },
          ],
        }),
    });

    render(
      <MemoryRouter initialEntries={['/app/instance']}>
        <InstancePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Default task timeout (seconds)')).toBeInTheDocument();
    expect(screen.queryByText('No instance settings found.')).not.toBeInTheDocument();
  });
});
