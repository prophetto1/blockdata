import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCoordinationStatus, type CoordinationStatusResponse } from '@/lib/coordinationApi';
import { renderWithQueryClient } from '@/test/renderWithQueryClient';
import { useCoordinationStatusQuery } from './useCoordinationStatusQuery';

vi.mock('@/lib/coordinationApi', () => ({
  getCoordinationStatus: vi.fn(),
}));

const mockedGetCoordinationStatus = vi.mocked(getCoordinationStatus);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function CoordinationStatusProbe() {
  const query = useCoordinationStatusQuery();

  if (query.isPending) {
    return <span>pending</span>;
  }

  if (query.isError) {
    return <span>{`error:${query.error instanceof Error ? query.error.message : String(query.error)}`}</span>;
  }

  return <span>{`success:${query.data?.broker.state ?? 'unknown'}`}</span>;
}

describe('useCoordinationStatusQuery', () => {
  it('loads coordination status through the existing coordination api helper', async () => {
    const statusFixture = {
      broker: {
        state: 'connected',
        url: 'nats://localhost:4222',
        server: 'nats-server',
        error_type: null,
      },
      streams: {},
      kv_buckets: {},
      presence_summary: {
        active_agents: 1,
      },
      identity_summary: {
        active_count: 1,
        stale_count: 0,
        host_count: 1,
        family_counts: {},
      },
      discussion_summary: {
        thread_count: 1,
        pending_count: 1,
        stale_count: 0,
        workspace_bound_count: 1,
      },
      session_classification_summary: {
        classified_count: 1,
        unknown_count: 0,
        counts_by_type: {},
        counts_by_provenance: {},
      },
      hook_audit_summary: {
        state: 'available',
        record_count: 1,
        allow_count: 1,
        warn_count: 0,
        block_count: 0,
        error_count: 0,
      },
      local_host_outbox_backlog: {
        files: 0,
        events: 0,
        bytes: 0,
      },
      app_runtime: {
        runtime_enabled: true,
        host: 'JON',
        runtime_root: '.codex-tmp/coordination-runtime',
      },
      stream_bridge: {
        state: 'connected',
        client_count: 1,
        last_error: null,
      },
    } as CoordinationStatusResponse;

    mockedGetCoordinationStatus.mockResolvedValue(statusFixture);

    renderWithQueryClient(<CoordinationStatusProbe />);

    await waitFor(() => {
      expect(screen.getByText('success:connected')).toBeInTheDocument();
    });

    expect(mockedGetCoordinationStatus).toHaveBeenCalledTimes(1);
  });
});
