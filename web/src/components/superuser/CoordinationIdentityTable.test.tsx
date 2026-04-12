import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CoordinationIdentityTable } from './CoordinationIdentityTable';
import type { CoordinationIdentityResponse } from '@/lib/coordinationApi';

const payload: CoordinationIdentityResponse = {
  summary: {
    active_count: 1,
    stale_count: 1,
    host_count: 1,
    family_counts: { cdx: 2 },
  },
  identities: [
    {
      identity: 'cdx',
      host: 'JON',
      family: 'cdx',
      session_agent_id: 'jon-runtime',
      claimed_at: '2026-04-11T12:00:00Z',
      last_heartbeat_at: '2026-04-11T12:01:00Z',
      expires_at: '2026-04-11T12:03:00Z',
      stale: false,
      revision: 4,
    },
    {
      identity: 'cdx2',
      host: 'JON',
      family: 'cdx',
      session_agent_id: 'jon-runtime-2',
      claimed_at: '2026-04-11T12:00:10Z',
      last_heartbeat_at: '2026-04-11T12:00:30Z',
      expires_at: '2026-04-11T12:01:00Z',
      stale: true,
      revision: 5,
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe('CoordinationIdentityTable', () => {
  it('renders an explicit loading state when identity data is still pending', () => {
    render(<CoordinationIdentityTable data={null} loading />);

    expect(screen.getByText('Loading claimed identities...')).toBeInTheDocument();
    expect(screen.getAllByText('Loading...')).toHaveLength(3);
  });

  it('renders identity lease rows and the locked summary counts', () => {
    render(<CoordinationIdentityTable data={payload} loading={false} />);

    expect(screen.getByTestId('coordination-identity-table')).toBeInTheDocument();
    expect(screen.getByText('Claimed Identities')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('1 stale')).toBeInTheDocument();
    expect(screen.getByText('1 host')).toBeInTheDocument();
    expect(screen.getByText('cdx')).toBeInTheDocument();
    expect(screen.getByText('cdx2')).toBeInTheDocument();
    expect(screen.getByText('jon-runtime')).toBeInTheDocument();
    expect(screen.getByText('stale')).toBeInTheDocument();
    expect(screen.getAllByTestId('coordination-identity-row')).toHaveLength(2);
  });

  it('renders an explicit empty state when no identities are present', () => {
    render(
      <CoordinationIdentityTable
        data={{
          summary: {
            active_count: 0,
            stale_count: 0,
            host_count: 0,
            family_counts: {},
          },
          identities: [],
        }}
        loading={false}
      />,
    );

    expect(screen.getByText('No claimed identities are currently visible.')).toBeInTheDocument();
  });

  it('treats null data as an empty state once loading completes', () => {
    render(<CoordinationIdentityTable data={null} loading={false} />);

    expect(screen.getByText('0 active')).toBeInTheDocument();
    expect(screen.getByText('0 stale')).toBeInTheDocument();
    expect(screen.getByText('0 host')).toBeInTheDocument();
    expect(screen.getByText('No claimed identities are currently visible.')).toBeInTheDocument();
  });
});
