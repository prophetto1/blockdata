import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { useOperationalReadiness } from './useOperationalReadiness';

const platformApiFetchMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useOperationalReadiness', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
  });

  it('merges the backend snapshot with browser diagnostics into one ordered readiness state model', async () => {
    platformApiFetchMock.mockResolvedValue(
      jsonResponse({
        generated_at: '2026-03-30T16:00:00Z',
        summary: { ok: 2, warn: 1, fail: 1, unknown: 0 },
        surfaces: [
          {
            id: 'agchain',
            label: 'AGChain',
            summary: { ok: 1, warn: 0, fail: 0, unknown: 0 },
            checks: [],
          },
          {
            id: 'shared',
            label: 'Shared',
            summary: { ok: 1, warn: 1, fail: 1, unknown: 0 },
            checks: [
              {
                id: 'shared.platform_api.ready',
                category: 'process',
                status: 'warn',
                label: 'Platform API readiness',
                summary: 'The API is up but degraded.',
                evidence: { saturation: 'high' },
                remediation: 'Reduce worker saturation.',
                checked_at: '2026-03-30T16:00:00Z',
              },
            ],
          },
        ],
      }),
    );

    const { result } = renderHook(() => useOperationalReadiness());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(platformApiFetchMock).toHaveBeenCalledWith('/admin/runtime/readiness?surface=all');
    expect(result.current.surfaces.map((surface) => surface.id)).toEqual(['shared', 'blockdata', 'agchain']);
    expect(result.current.summary).toEqual({ ok: 2, warn: 1, fail: 1, unknown: 0 });
    expect(result.current.clientDiagnostics.map((item) => item.label)).toEqual([
      'Frontend Origin',
      'Platform API Base Mode',
      'Auth Bypass Mode',
    ]);
  });

  it('refreshes the backend snapshot and client diagnostics together through one public action', async () => {
    platformApiFetchMock.mockResolvedValue(
      jsonResponse({
        generated_at: '2026-03-30T16:00:00Z',
        summary: { ok: 1, warn: 0, fail: 0, unknown: 0 },
        surfaces: [],
      }),
    );

    const { result } = renderHook(() => useOperationalReadiness());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(platformApiFetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.refreshing).toBe(false);
  });
});
