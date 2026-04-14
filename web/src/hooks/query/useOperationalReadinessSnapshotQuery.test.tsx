import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClientWrapper } from '@/test/renderWithQueryClient';
import {
  loadOperationalReadinessWithBootstrap,
  type LoadOperationalReadinessWithBootstrapResult,
} from '@/lib/platformApiDiagnostics';
import { useOperationalReadinessSnapshotQuery } from './useOperationalReadinessSnapshotQuery';

vi.mock('@/lib/platformApiDiagnostics', () => ({
  loadOperationalReadinessWithBootstrap: vi.fn(),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: vi.fn(),
}));

const mockedLoadOperationalReadinessWithBootstrap = vi.mocked(loadOperationalReadinessWithBootstrap);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useOperationalReadinessSnapshotQuery', () => {
  it('loads readiness data through the platform diagnostics helper', async () => {
    const readinessFixture = {
      bootstrap: {
        diagnosis_kind: 'ready',
        diagnosis_title: 'Ready',
        diagnosis_summary: 'Bootstrap succeeded.',
        snapshot_available: true,
        base_mode: 'relative_proxy',
        frontend_origin: 'http://localhost:5374',
        platform_api_target: '/platform-api',
        probes: [],
      },
      snapshot: {
        generated_at: '2026-04-14T00:00:00.000Z',
        summary: { ok: 1, warn: 0, fail: 0, unknown: 0 },
        surfaces: [],
      },
      clientDiagnostics: [],
    } as LoadOperationalReadinessWithBootstrapResult;

    mockedLoadOperationalReadinessWithBootstrap.mockResolvedValue(readinessFixture);

    const { wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useOperationalReadinessSnapshotQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedLoadOperationalReadinessWithBootstrap).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe(readinessFixture);
  });
});
