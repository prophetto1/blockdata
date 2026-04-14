import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCoordinationStatus, type CoordinationStatusResponse } from '@/lib/coordinationApi';
import { createQueryClientWrapper } from '@/test/renderWithQueryClient';
import { useCoordinationStatusQuery } from './useCoordinationStatusQuery';

vi.mock('@/lib/coordinationApi', () => ({
  getCoordinationStatus: vi.fn(),
}));

const mockedGetCoordinationStatus = vi.mocked(getCoordinationStatus);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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

    const { wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useCoordinationStatusQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetCoordinationStatus).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe(statusFixture);
  });
});
