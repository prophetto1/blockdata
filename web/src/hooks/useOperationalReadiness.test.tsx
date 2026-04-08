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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const readyBootstrap = {
  diagnosis_kind: 'ready',
  diagnosis_title: 'Ready',
  diagnosis_summary: 'Bootstrap checks passed and the readiness snapshot is authoritative.',
  snapshot_available: true,
  base_mode: 'relative_proxy' as const,
  frontend_origin: 'http://localhost:5374',
  platform_api_target: '/platform-api',
  probes: [],
};

const failingBucketCorsSnapshot = {
  generated_at: '2026-03-30T16:00:00Z',
  summary: { ok: 0, warn: 0, fail: 1, unknown: 0 },
  surfaces: [
    {
      id: 'blockdata',
      label: 'BlockData',
      summary: { ok: 0, warn: 0, fail: 1, unknown: 0 },
      checks: [
        {
          check_id: 'blockdata.storage.bucket_cors',
          surface_id: 'blockdata',
          category: 'connectivity',
          status: 'fail',
          label: 'Bucket CORS',
          summary: 'Browser upload CORS is missing.',
          cause: null,
          cause_confidence: null,
          depends_on: [],
          blocked_by: [],
          available_actions: [
            {
              action_kind: 'storage_browser_upload_cors_reconcile',
              label: 'Reconcile bucket CORS policy',
              description: 'Apply the checked-in browser upload CORS policy to the user-storage bucket.',
              route: '/admin/runtime/storage/browser-upload-cors/reconcile',
              requires_confirmation: true,
            },
          ],
          verify_after: [],
          next_if_still_failing: [],
          actionability: 'backend_action',
          evidence: { cors_configured: false },
          remediation: 'Apply browser upload CORS rules that allow PUT/POST to the bucket.',
          checked_at: '2026-03-30T16:00:00Z',
        },
      ],
    },
  ],
};

const passingBucketCorsSnapshot = {
  generated_at: '2026-03-30T16:05:00Z',
  summary: { ok: 1, warn: 0, fail: 0, unknown: 0 },
  surfaces: [
    {
      id: 'blockdata',
      label: 'BlockData',
      summary: { ok: 1, warn: 0, fail: 0, unknown: 0 },
      checks: [
        {
          check_id: 'blockdata.storage.bucket_cors',
          surface_id: 'blockdata',
          category: 'connectivity',
          status: 'ok',
          label: 'Bucket CORS',
          summary: 'Bucket browser-upload CORS rules are configured.',
          cause: null,
          cause_confidence: null,
          depends_on: [],
          blocked_by: [],
          available_actions: [],
          verify_after: [],
          next_if_still_failing: [],
          actionability: 'info_only',
          evidence: { cors_configured: true },
          remediation: 'No action required.',
          checked_at: '2026-03-30T16:05:00Z',
        },
      ],
    },
  ],
};

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

  it('executes a readiness action, tracks pending and success state, and refreshes the snapshot afterward', async () => {
    loadOperationalReadinessWithBootstrapMock
      .mockResolvedValueOnce({
        bootstrap: readyBootstrap,
        snapshot: failingBucketCorsSnapshot,
        clientDiagnostics: [],
      })
      .mockResolvedValueOnce({
        bootstrap: readyBootstrap,
        snapshot: passingBucketCorsSnapshot,
        clientDiagnostics: [],
      });
    platformApiFetchMock.mockResolvedValueOnce(
      jsonResponse({
        action_kind: 'storage_browser_upload_cors_reconcile',
        check_id: 'blockdata.storage.bucket_cors',
        result: 'success',
        result_payload: { bucket_name: 'blockdata-user-content-dev' },
      }),
    );

    const { result } = renderHook(() => useOperationalReadiness());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const blockdataSurface = result.current.surfaces.find((surface) => surface.id === 'blockdata')!;
    const action = blockdataSurface.checks[0]!.available_actions[0]!;
    const actionKey = 'blockdata.storage.bucket_cors:storage_browser_upload_cors_reconcile';

    let execution: Promise<void>;
    act(() => {
      execution = result.current.executeAction('blockdata.storage.bucket_cors', action);
    });

    expect(result.current.actionStates[actionKey]).toMatchObject({
      status: 'pending',
    });

    await act(async () => {
      await execution!;
    });

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledWith(
        '/admin/runtime/storage/browser-upload-cors/reconcile',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ confirmed: true }),
        }),
        { platformApiTarget: '/platform-api' },
      );
      expect(loadOperationalReadinessWithBootstrapMock).toHaveBeenCalledTimes(2);
      expect(result.current.surfaces.find((surface) => surface.id === 'blockdata')!.checks[0]!.status).toBe('ok');
      expect(result.current.actionStates[actionKey]).toMatchObject({
        status: 'success',
      });
    });
  });

  it('surfaces action execution errors without refreshing the snapshot', async () => {
    loadOperationalReadinessWithBootstrapMock.mockResolvedValueOnce({
      bootstrap: readyBootstrap,
      snapshot: failingBucketCorsSnapshot,
      clientDiagnostics: [],
    });
    platformApiFetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'Failed to reconcile browser upload CORS policy' }, 500),
    );

    const { result } = renderHook(() => useOperationalReadiness());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const blockdataSurface = result.current.surfaces.find((surface) => surface.id === 'blockdata')!;
    const action = blockdataSurface.checks[0]!.available_actions[0]!;
    const actionKey = 'blockdata.storage.bucket_cors:storage_browser_upload_cors_reconcile';

    await act(async () => {
      await result.current.executeAction('blockdata.storage.bucket_cors', action);
    });

    await waitFor(() => {
      expect(loadOperationalReadinessWithBootstrapMock).toHaveBeenCalledTimes(1);
      expect(result.current.actionStates[actionKey]).toMatchObject({
        status: 'error',
      });
      expect(result.current.actionStates[actionKey]?.message).toContain(
        'Failed to reconcile browser upload CORS policy',
      );
    });
  });
});
