import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOperationalReadiness } from './useOperationalReadiness';

const platformApiFetchMock = vi.fn();
const loadOperationalReadinessWithBootstrapMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/lib/platformApiDiagnostics', () => ({
  loadOperationalReadinessWithBootstrap: (...args: unknown[]) =>
    loadOperationalReadinessWithBootstrapMock(...args),
}));

describe('useOperationalReadiness', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    loadOperationalReadinessWithBootstrapMock.mockReset();
  });

  it('returns explicit bootstrap auth diagnosis and no authoritative snapshot when bootstrap blocks the page', async () => {
    loadOperationalReadinessWithBootstrapMock.mockResolvedValue({
      bootstrap: {
        diagnosis_kind: 'auth_missing',
        diagnosis_title: 'Authentication required before loading readiness snapshot',
        diagnosis_summary: 'The readiness route is present, but no local auth token is available yet.',
        snapshot_available: false,
        base_mode: 'relative_proxy',
        frontend_origin: 'http://localhost:5374',
        platform_api_target: '/platform-api',
        probes: [
          {
            probe_id: 'frontend_origin',
            label: 'Frontend origin',
            status: 'ok',
            summary: 'Current browser origin',
            detail: 'http://localhost:5374',
          },
          {
            probe_id: 'platform_api_target',
            label: 'Platform API target',
            status: 'ok',
            summary: 'Relative proxy target',
            detail: '/platform-api',
          },
          {
            probe_id: 'health_probe',
            label: 'Health probe',
            status: 'ok',
            summary: 'Platform API reachable',
            detail: 'GET /health returned 200.',
            target_url: '/platform-api/health',
            http_status_code: 200,
          },
          {
            probe_id: 'readiness_route_probe',
            label: 'Readiness route probe',
            status: 'warn',
            summary: 'Readiness route requires auth',
            detail: 'GET /admin/runtime/readiness returned 401.',
            target_url: '/platform-api/admin/runtime/readiness?surface=all',
            http_status_code: 401,
          },
          {
            probe_id: 'auth_token_probe',
            label: 'Auth token probe',
            status: 'fail',
            summary: 'No token available',
            detail: 'The browser session has no local access token.',
          },
          {
            probe_id: 'snapshot_request',
            label: 'Snapshot request',
            status: 'skipped',
            summary: 'Skipped until auth exists',
            detail: 'The authenticated snapshot request was not attempted.',
          },
        ],
      },
      snapshot: null,
      clientDiagnostics: [
        {
          id: 'client.origin',
          label: 'Frontend Origin',
          value: 'http://localhost:5374',
          summary: 'Current browser origin for this session.',
        },
      ],
    });

    const { result } = renderHook(() => useOperationalReadiness());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(loadOperationalReadinessWithBootstrapMock).toHaveBeenCalledTimes(1);
    expect(result.current.bootstrap.diagnosis_kind).toBe('auth_missing');
    expect(result.current.summary).toBeNull();
    expect(result.current.surfaces).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns authoritative summary and ordered readiness surfaces only after bootstrap and snapshot both succeed', async () => {
    loadOperationalReadinessWithBootstrapMock.mockResolvedValue({
      bootstrap: {
        diagnosis_kind: 'ready',
        diagnosis_title: 'Ready',
        diagnosis_summary: 'Bootstrap checks passed and the readiness snapshot is authoritative.',
        snapshot_available: true,
        base_mode: 'relative_proxy',
        frontend_origin: 'http://localhost:5374',
        platform_api_target: '/platform-api',
        probes: [
          {
            probe_id: 'health_probe',
            label: 'Health probe',
            status: 'ok',
            summary: 'Platform API reachable',
            detail: 'GET /health returned 200.',
            target_url: '/platform-api/health',
            http_status_code: 200,
          },
          {
            probe_id: 'snapshot_request',
            label: 'Snapshot request',
            status: 'ok',
            summary: 'Readiness snapshot loaded',
            detail: 'Authenticated readiness snapshot returned 200.',
            target_url: '/platform-api/admin/runtime/readiness?surface=all',
            http_status_code: 200,
          },
        ],
      },
      snapshot: {
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
            checks: [],
          },
          {
            id: 'blockdata',
            label: 'BlockData',
            summary: { ok: 0, warn: 0, fail: 0, unknown: 0 },
            checks: [],
          },
        ],
      },
      clientDiagnostics: [
        {
          id: 'client.origin',
          label: 'Frontend Origin',
          value: 'http://localhost:5374',
          summary: 'Current browser origin for this session.',
        },
        {
          id: 'client.platform_api_target',
          label: 'Platform API Target',
          value: '/platform-api',
          summary: 'Resolved platform API target for this session.',
        },
      ],
    });

    const { result } = renderHook(() => useOperationalReadiness());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bootstrap.diagnosis_kind).toBe('ready');
    expect(result.current.summary).toEqual({ ok: 2, warn: 1, fail: 1, unknown: 0 });
    expect(result.current.surfaces.map((surface) => surface.id)).toEqual(['shared', 'blockdata', 'agchain']);
    expect(result.current.refreshedAt).toBe('2026-03-30T16:00:00Z');
  });

  it('refreshes bootstrap diagnosis and readiness snapshot together through one public action', async () => {
    loadOperationalReadinessWithBootstrapMock.mockResolvedValue({
      bootstrap: {
        diagnosis_kind: 'ready',
        diagnosis_title: 'Ready',
        diagnosis_summary: 'Bootstrap checks passed and the readiness snapshot is authoritative.',
        snapshot_available: true,
        base_mode: 'relative_proxy',
        frontend_origin: 'http://localhost:5374',
        platform_api_target: '/platform-api',
        probes: [],
      },
      snapshot: {
        generated_at: '2026-03-30T16:00:00Z',
        summary: { ok: 1, warn: 0, fail: 0, unknown: 0 },
        surfaces: [],
      },
      clientDiagnostics: [],
    });

    const { result } = renderHook(() => useOperationalReadiness());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(loadOperationalReadinessWithBootstrapMock).toHaveBeenCalledTimes(2);
    expect(result.current.refreshing).toBe(false);
  });
});
